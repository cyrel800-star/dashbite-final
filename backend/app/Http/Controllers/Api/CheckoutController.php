<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CheckoutService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CheckoutController extends Controller
{
    public function __construct(private CheckoutService $checkoutService)
    {
    }

    /**
     * REQ-06 AC #4: List customer order history.
     */
    public function index(Request $request)
    {
        $orders = $request->user()->orders()
            ->with(['items', 'restaurant:id,name,address'])
            ->orderByDesc('placed_at')
            ->get()
            ->map(function ($order) {
                return [
                    'id'               => $order->id,
                    'order_id'         => $order->id,
                    'order_number'     => $order->order_number,
                    'status'           => $order->status->toContract(),
                    'total'            => $order->total,
                    'total_amount'     => $order->total,
                    'delivery_address' => $order->delivery_address,
                    'payment_method'   => strtoupper($order->payment_method->value),
                    'restaurant'       => $order->restaurant,
                    'items'            => $order->items,
                    'placed_at'        => $order->placed_at?->toIso8601String(),
                    'delivered_at'     => $order->delivered_at?->toIso8601String(),
                ];
            });

        return response()->json([
            'message' => 'Orders retrieved.',
            'data'    => $orders,
        ]);
    }

    /**
     * Endpoint 2: Create Order (Customer)
     * POST /api/orders (Primary) and POST /api/checkout (Alias)
     */
    public function store(Request $request)
    {
        try {
            $data = $request->validate([
                'idempotency_key'      => ['nullable', 'string', 'max:255'],
                'restaurant_id'        => ['required', 'exists:restaurants,id'],
                'items'                => ['required', 'array', 'min:1'],
                'items.*.menu_item_id' => ['required', 'exists:menu_items,id'],
                'items.*.quantity'     => ['required', 'integer', 'min:1'],
                'delivery_address'     => ['required', 'string', 'max:500'],
                'delivery_lat'         => ['nullable', 'numeric', 'between:-90,90'],
                'delivery_lng'         => ['nullable', 'numeric', 'between:-180,180'],
                'notes'                => ['nullable', 'string', 'max:1000'],
                'payment_method'       => ['nullable', 'in:cod,online'],
            ]);
        } catch (ValidationException $e) {
            $firstMessage = collect($e->errors())->flatten()->first() ?: 'Validation failed.';
            return response()->json([
                'error'   => 'MISSING_FIELD',
                'message' => $firstMessage,
                'errors'  => $e->errors(),
            ], 400);
        }

        try {
            $order = $this->checkoutService->checkout($request->user(), $data);
        } catch (ValidationException $e) {
            $firstMessage = collect($e->errors())->flatten()->first() ?: 'Order could not be placed.';

            if (str_contains($firstMessage, 'no longer available') || str_contains($firstMessage, 'out of stock')) {
                return response()->json([
                    'error'   => 'OUT_OF_STOCK',
                    'message' => $firstMessage,
                ], 400);
            }

            if (str_contains($firstMessage, 'outside the service area') || str_contains($firstMessage, 'service boundary')) {
                return response()->json([
                    'error'   => 'OUT_OF_BOUNDARY',
                    'message' => $firstMessage,
                ], 400);
            }

            return response()->json([
                'error'   => 'INVALID_ORDER',
                'message' => $firstMessage,
                'errors'  => $e->errors(),
            ], 400);
        }

        // Contract Pack v1.0 success response
        return response()->json([
            'order_id' => $order->id,
            'status'   => $order->status->toContract(),
            'message'  => 'Order placed successfully.',
            'data'     => $order,
        ], 201);
    }

    public function show(Request $request, int $id)
    {
        $order = $request->user()->orders()->with(['items', 'restaurant'])->find($id);

        if (! $order) {
            return response()->json(['error' => 'ORDER_NOT_FOUND', 'message' => 'Order not found.'], 404);
        }

        return response()->json([
            'order_id' => $order->id,
            'status'   => $order->status->toContract(),
            'data'     => $order,
        ]);
    }
}
