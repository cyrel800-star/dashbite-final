<?php

namespace App\Services;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\SettlementType;
use App\Models\Order;
use App\Models\PaymentRecord;
use App\Models\Settlement;
use App\Models\User;

class PaymentService
{
    public const RIDER_CUT    = 20.00; // flat per delivery (MVP)
    public const PLATFORM_FEE = 0.00;  // 0% platform commission (Decision Log W1.02 hardcoded zero)

    /**
     * Auto-create payment record when an order is delivered (COD).
     */
    public function recordCodCollected(Order $order): PaymentRecord
    {
        $existing = PaymentRecord::where('order_id', $order->id)->first();
        if ($existing) {
            return $existing;
        }

        $riderCut        = self::RIDER_CUT;
        $platformFee     = self::PLATFORM_FEE;
        $restaurantShare = (float) $order->subtotal; // 0% commission: full subtotal belongs to restaurant

        $status = PaymentStatus::CollectedByRider;
        if ($order->cash_collected !== null && (float) $order->cash_collected < (float) $order->total) {
            $status = PaymentStatus::FlaggedDiscrepancy;
        }

        return PaymentRecord::create([
            'order_id'         => $order->id,
            'method'           => PaymentMethod::Cod,
            'status'           => $status,
            'amount'           => $order->total,
            'rider_cut'        => $riderCut,
            'platform_fee'     => $platformFee,
            'restaurant_share' => $restaurantShare,
            'collected_at'     => now(),
        ]);
    }

    /**
     * W6.04 AC #1: Rider → Admin COD remittance.
     * Decision Log W1.02: Any short remittance halts auto-settlement and routes order to Admin Discrepancy Queue.
     */
    public function recordRiderRemittance(PaymentRecord $record, User $admin, float $amount, ?string $notes = null): Settlement
    {
        $rider = $record->order->rider ?: $record->order->dispatchAttempts()
            ->where('status', 'assigned')
            ->first()?->winner;

        $isShort = $amount < (float) $record->amount;

        $settlement = Settlement::create([
            'payment_record_id' => $record->id,
            'type'              => SettlementType::RiderRemittance,
            'from_user_id'      => $rider?->id,
            'amount'            => $amount,
            'status'            => $isShort ? 'flagged' : 'completed',
            'recorded_by'       => $admin->id,
            'notes'             => $isShort ? ($notes ? $notes . ' (Short remittance flagged)' : 'Short remittance flagged') : $notes,
            'completed_at'      => now(),
        ]);

        if ($isShort) {
            $record->update(['status' => PaymentStatus::FlaggedDiscrepancy]);
        } else {
            $record->update(['status' => PaymentStatus::RemittedToAdmin]);
        }

        return $settlement;
    }

    /**
     * W6.04 AC #1 & AC #2: Admin → Restaurant payout.
     */
    public function recordRestaurantPayout(PaymentRecord $record, User $admin, float $amount, ?string $notes = null): Settlement
    {
        $order = $record->order;

        $settlement = Settlement::create([
            'payment_record_id' => $record->id,
            'type'              => SettlementType::RestaurantPayout,
            'from_user_id'      => $admin->id,
            'to_restaurant_id'  => $order->restaurant_id,
            'amount'            => $amount,
            'status'            => 'completed',
            'recorded_by'       => $admin->id,
            'notes'             => $notes,
            'completed_at'      => now(),
        ]);

        // AC #2: short remittance or short payout → halts auto-settlement
        $remitted = (float) $record->settlements()
            ->where('type', SettlementType::RiderRemittance->value)
            ->where('status', 'completed')
            ->sum('amount');

        $payout = (float) $record->settlements()
            ->where('type', SettlementType::RestaurantPayout->value)
            ->where('status', 'completed')
            ->sum('amount');

        if ($remitted >= (float) $record->amount && $payout >= (float) $record->restaurant_share) {
            $record->update([
                'status'     => PaymentStatus::SettledToRestaurant,
                'settled_at' => now(),
            ]);
        }

        return $settlement;
    }

    /**
     * Resolve discrepancy in payment record manually (Admin action).
     */
    public function resolveDiscrepancy(PaymentRecord $record, User $admin, string $notes): PaymentRecord
    {
        $record->settlements()->where('status', 'flagged')->update(['status' => 'completed']);
        $record->update([
            'status' => PaymentStatus::RemittedToAdmin,
        ]);

        return $record->fresh(['settlements']);
    }
}
