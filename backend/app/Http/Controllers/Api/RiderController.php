<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DispatchOffer;
use App\Models\Order;
use App\Models\User;
use App\Services\DispatchService;
use App\Services\OrderLifecycleService;
use App\Services\RiderService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class RiderController extends Controller
{
    public function __construct(
        private RiderService $riderService,
        private DispatchService $dispatchService
    ) {
    }

    /**
     * GET /api/rider/offers
     * List open dispatch offers for this rider.
     */
    public function offers(Request $request)
    {
        $rider = $request->user();

        $offers = DispatchOffer::with(['order.restaurant:id,name,address', 'order.items'])
            ->where('rider_id', $rider->id)
            ->where('status', 'pending')
            ->orderByDesc('id')
            ->get()
            ->map(function ($offer) {
                return [
                    'offer_id'       => $offer->id,
                    'order_id'       => $offer->order_id,
                    'status'         => 'BLASTED',
                    'ring_radius_km' => $offer->attempt?->ring_km ?? 1,
                    'restaurant'     => $offer->order?->restaurant,
                    'items'          => $offer->order?->items,
                    'total_amount'   => $offer->order?->total,
                    'delivery_address' => $offer->order?->delivery_address,
                    'offered_at'     => $offer->offered_at?->toIso8601String(),
                ];
            });

        return response()->json([
            'message' => 'Offers retrieved.',
            'data'    => $offers,
        ]);
    }

    /**
     * GET /api/rider/deliveries
     * List active and historical assigned deliveries for this rider.
     */
    public function deliveries(Request $request)
    {
        $rider = $request->user();

        $orders = Order::with(['restaurant:id,name,address', 'items', 'customer:id,name'])
            ->where(function ($query) use ($rider) {
                $query->where('rider_id', $rider->id)
                    ->orWhereHas('dispatchAttempts', function ($q) use ($rider) {
                        $q->where('status', 'assigned')->where('winner_rider_id', $rider->id);
                    });
            })
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'message' => 'Deliveries retrieved.',
            'data'    => $orders,
        ]);
    }

    /**
     * Endpoint 3: Rider Atomic Claim (Primary Contract Endpoint)
     * POST /api/dispatch/accept-offer
     * Payload: { "order_id": 123, "rider_id": 456 }
     */
    public function claimOffer(Request $request)
    {
        $orderId = $request->input('order_id');
        $rider = $request->user();

        $order = Order::find($orderId);
        if (! $order) {
            return response()->json([
                'error'   => 'OFFER_ALREADY_CLAIMED',
                'message' => 'Offer closed. Another rider accepted it first.',
            ], 409);
        }

        // Find pending offer for this rider on this order
        $offer = DispatchOffer::where('order_id', $orderId)
            ->where('rider_id', $rider->id)
            ->where('status', 'pending')
            ->first();

        if (! $offer) {
            return response()->json([
                'error'   => 'OFFER_ALREADY_CLAIMED',
                'message' => 'Offer closed. Another rider accepted it first.',
            ], 409);
        }

        $won = $this->dispatchService->accept($offer, $rider);

        if (! $won) {
            return response()->json([
                'error'   => 'OFFER_ALREADY_CLAIMED',
                'message' => 'Offer closed. Another rider accepted it first.',
            ], 409);
        }

        return response()->json([
            'status'  => 'ASSIGNED',
            'message' => 'You have accepted the order.',
            'data'    => [
                'order_id' => $order->id,
                'status'   => 'ASSIGNED',
            ],
        ], 200);
    }

    /**
     * Legacy Alias: POST /api/rider/offers/{id}/accept
     */
    public function acceptOffer(Request $request, int $offerId)
    {
        $offer = DispatchOffer::find($offerId);

        if (! $offer || $offer->rider_id !== $request->user()->id) {
            return response()->json([
                'error'   => 'OFFER_ALREADY_CLAIMED',
                'message' => 'Offer closed. Another rider accepted it first.',
            ], 409);
        }

        $won = $this->dispatchService->accept($offer, $request->user());

        if (! $won) {
            return response()->json([
                'error'   => 'OFFER_ALREADY_CLAIMED',
                'message' => 'Offer closed. Another rider accepted it first.',
            ], 409);
        }

        return response()->json([
            'status'  => 'ASSIGNED',
            'message' => 'Offer accepted.',
            'data'    => [
                'order_id' => $offer->order_id,
                'status'   => 'ASSIGNED',
            ],
        ], 200);
    }

    /**
     * POST /api/dispatch/orders/{id}/timeout
     * Expand dispatch ring by 1 km or set NO_RIDER if boundary reached.
     */
    public function timeoutRing(Request $request, int $orderId)
    {
        $order = Order::find($orderId);
        if (! $order) {
            return response()->json(['error' => 'ORDER_NOT_FOUND', 'message' => 'Order not found.'], 404);
        }

        $attempt = $this->dispatchService->expandRing($order);
        $order->refresh();

        return response()->json([
            'message'        => $order->status === \App\Enums\OrderStatus::NoRider ? 'Boundary reached without rider.' : 'Dispatch ring expanded.',
            'order_status'   => $order->status->toContract(),
            'ring_radius_km' => $attempt->ring_km,
            'status'         => $attempt->status,
        ]);
    }

    /**
     * POST /api/rider/availability
     */
    public function setAvailability(Request $request)
    {
        $data = $request->validate([
            'is_online'    => ['required', 'boolean'],
            'is_available' => ['required', 'boolean'],
        ]);

        $rider = $request->user();

        $this->riderService->setOnline($rider, $data['is_online']);
        $profile = $this->riderService->setAvailability($rider, $data['is_available']);

        return response()->json([
            'message' => 'Availability updated.',
            'data'    => [
                'is_online'        => $profile->is_online,
                'is_available'     => $profile->is_available,
                'last_location_at' => $profile->last_location_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * PATCH /api/rider/location
     */
    public function updateLocation(Request $request)
    {
        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $profile = $this->riderService->updateLocation(
            $request->user(),
            (float) $data['lat'],
            (float) $data['lng']
        );

        return response()->json([
            'message' => 'Location updated.',
            'data'    => [
                'current_lat'      => $profile->current_lat,
                'current_lng'      => $profile->current_lng,
                'last_location_at' => $profile->last_location_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * GET /api/rider/status
     */
    public function status(Request $request)
    {
        $profile = $this->riderService->getOrCreateProfile($request->user());

        return response()->json([
            'data' => [
                'is_online'          => $profile->is_online,
                'is_available'       => $profile->is_available,
                'current_lat'        => $profile->current_lat,
                'current_lng'        => $profile->current_lng,
                'last_location_at'   => $profile->last_location_at?->toIso8601String(),
                'has_fresh_location' => $profile->hasFreshLocation(),
                'is_eligible'        => $profile->isEligibleForDispatch(),
            ],
        ]);
    }

    /**
     * W6.02: Rider marks order as picked up.
     */
    public function markPickedUp(Request $request, int $orderId)
    {
        $order = $this->findRiderOrder($request->user(), $orderId);

        try {
            $order = app(OrderLifecycleService::class)->markPickedUp($order, $request->user());
        } catch (ValidationException $e) {
            return response()->json([
                'error'   => 'INVALID_TRANSITION',
                'message' => 'Delivered before pickup is not allowed or transition invalid.',
                'errors'  => $e->errors(),
            ], 422);
        }

        return response()->json([
            'message' => 'Order marked as picked up.',
            'status'  => 'PICKED_UP',
            'data'    => $order,
        ]);
    }

    /**
     * W6.02: Rider marks order as delivered + records COD.
     */
    public function markDelivered(Request $request, int $orderId)
    {
        $order = $this->findRiderOrder($request->user(), $orderId);

        $data = $request->validate([
            'cash_collected' => ['nullable', 'numeric', 'min:0'],
        ]);

        try {
            $order = app(OrderLifecycleService::class)->markDelivered(
                $order,
                $request->user(),
                isset($data['cash_collected']) ? (float) $data['cash_collected'] : null
            );
        } catch (ValidationException $e) {
            return response()->json([
                'error'   => 'INVALID_TRANSITION',
                'message' => 'Cannot mark delivered before pickup.',
                'errors'  => $e->errors(),
            ], 422);
        }

        // Auto-create payment record
        if ($order->payment_method === \App\Enums\PaymentMethod::Cod) {
            app(\App\Services\PaymentService::class)->recordCodCollected($order);
        }

        // Free up rider for next dispatch
        \App\Models\RiderProfile::where('user_id', $request->user()->id)
            ->update(['is_available' => true]);

        return response()->json([
            'message' => 'Order delivered.',
            'status'  => 'DELIVERED',
            'data'    => $order,
        ]);
    }

    private function findRiderOrder(User $rider, int $orderId): Order
    {
        $order = Order::find($orderId);

        if (! $order) {
            abort(response()->json(['error' => 'ORDER_NOT_FOUND', 'message' => 'Order not found.'], 404));
        }

        // Assigned directly or via dispatch attempt
        $isWinner = $order->rider_id === $rider->id || \App\Models\DispatchAttempt::where('order_id', $order->id)
            ->where('status', 'assigned')
            ->where('winner_rider_id', $rider->id)
            ->exists();

        if (! $isWinner) {
            abort(response()->json(['error' => 'ORDER_NOT_ASSIGNED', 'message' => 'Order not assigned to you.'], 403));
        }

        return $order;
    }
}
