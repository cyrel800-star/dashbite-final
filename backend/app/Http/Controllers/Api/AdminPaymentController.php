<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\PaymentRecord;
use App\Services\PaymentService;
use Illuminate\Http\Request;

class AdminPaymentController extends Controller
{
    public function __construct(private PaymentService $payments)
    {
    }

    public function index(Request $request)
    {
        $records = PaymentRecord::with(['order.customer:id,name', 'order.restaurant:id,name'])
            ->orderByDesc('id')
            ->paginate(20);

        return response()->json($records);
    }

    /**
     * Decision Log W1.02: Admin Discrepancy Queue
     */
    public function discrepancies(Request $request)
    {
        $records = PaymentRecord::with(['order.customer:id,name', 'order.restaurant:id,name', 'settlements'])
            ->where('status', PaymentStatus::FlaggedDiscrepancy)
            ->orWhereHas('settlements', fn ($q) => $q->where('status', 'flagged'))
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'message' => 'Discrepancy queue retrieved.',
            'data'    => $records,
        ]);
    }

    public function show(int $id)
    {
        $record = PaymentRecord::with(['order', 'settlements'])->find($id);

        if (! $record) {
            return response()->json(['error' => 'payment_record_not_found'], 404);
        }

        return response()->json(['data' => $record]);
    }

    /**
     * W6.04 AC #1: Record rider → admin COD remittance.
     */
    public function recordRemittance(Request $request, int $id)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'notes'  => ['nullable', 'string', 'max:500'],
        ]);

        $record = PaymentRecord::find($id);
        if (! $record) {
            return response()->json(['error' => 'payment_record_not_found'], 404);
        }

        $settlement = $this->payments->recordRiderRemittance(
            $record, $request->user(), (float) $data['amount'], $data['notes'] ?? null
        );

        return response()->json([
            'message' => 'Rider remittance recorded.',
            'data'    => $settlement,
            'payment_status' => $record->fresh()->status->toContract(),
        ], 201);
    }

    /**
     * W6.04 AC #1: Record admin → restaurant payout.
     */
    public function recordPayout(Request $request, int $id)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'notes'  => ['nullable', 'string', 'max:500'],
        ]);

        $record = PaymentRecord::find($id);
        if (! $record) {
            return response()->json(['error' => 'payment_record_not_found'], 404);
        }

        $settlement = $this->payments->recordRestaurantPayout(
            $record, $request->user(), (float) $data['amount'], $data['notes'] ?? null
        );

        return response()->json([
            'message' => 'Restaurant payout recorded.',
            'data'    => $settlement,
            'payment_status' => $record->fresh()->status->toContract(),
        ], 201);
    }

    /**
     * Resolve a flagged discrepancy manually in the admin queue.
     */
    public function resolveDiscrepancy(Request $request, int $id)
    {
        $data = $request->validate([
            'notes' => ['required', 'string', 'max:500'],
        ]);

        $record = PaymentRecord::find($id);
        if (! $record) {
            return response()->json(['error' => 'payment_record_not_found'], 404);
        }

        $updated = $this->payments->resolveDiscrepancy($record, $request->user(), $data['notes']);

        return response()->json([
            'message' => 'Discrepancy resolved.',
            'data'    => $updated,
            'payment_status' => $updated->status->toContract(),
        ]);
    }
}
