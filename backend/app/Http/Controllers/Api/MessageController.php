<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\Order;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    /**
     * Only allow a user to access chat for an order they are connected to:
     * - Customer: owns the order
     * - Restaurant: order is for their restaurant
     * - Rider: is assigned to the order
     * - Admin: any order
     */
    private function authorizeOrder(Request $request, Order $order): void
    {
        $user = $request->user();
        $role = $user->role->value;

        if ($role === 'admin') {
            return;
        }

        if ($role === 'customer' && (int) $order->customer_id === (int) $user->id) {
            return;
        }

        if (
            $role === 'restaurant'
            && $user->restaurant_id
            && (int) $order->restaurant_id === (int) $user->restaurant_id
        ) {
            return;
        }

        if ($role === 'rider' && $order->rider_id && (int) $order->rider_id === (int) $user->id) {
            return;
        }

        // Hide existence of orders the user is not part of
        abort(response()->json(['error' => 'order_not_found'], 404));
    }

    private function transform(Message $m): array
    {
        return [
            'id'          => $m->id,
            'order_id'    => $m->order_id,
            'sender_id'   => $m->sender_id,
            'sender_name' => $m->sender?->name ?? 'Unknown',
            'sender_role' => $m->sender?->role->value ?? 'unknown',
            'body'        => $m->body,
            'created_at'  => $m->created_at->toIso8601String(),
        ];
    }

    public function index(Request $request, Order $order)
    {
        $this->authorizeOrder($request, $order);

        $messages = $order->messages()
            ->with('sender:id,name,role')
            ->orderBy('created_at')
            ->get()
            ->map(fn ($m) => $this->transform($m));

        return response()->json(['data' => $messages]);
    }

    public function store(Request $request, Order $order)
    {
        $this->authorizeOrder($request, $order);

        $data = $request->validate([
            'body' => ['required', 'string', 'min:1', 'max:500'],
        ]);

        $message = Message::create([
            'order_id'  => $order->id,
            'sender_id' => $request->user()->id,
            'body'      => $data['body'],
        ]);

        $message->load('sender:id,name,role');

        return response()->json(['data' => $this->transform($message)], 201);
    }
}