<?php

namespace App\Models;

use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

        protected $fillable = [
        'order_number', 'idempotency_key', 'customer_id', 'restaurant_id', 'rider_id',
        'status', 'payment_method', 'source', 'external_customer_name',
        'external_customer_phone', 'subtotal', 'delivery_fee', 'frozen_delivery_fee',
        'frozen_service_boundary', 'total', 'delivery_address', 'delivery_lat',
        'delivery_lng', 'notes', 'placed_at', 'accepted_at', 'delivered_at',
        'cancelled_at', 'cash_collected', 'cash_collected_at'
    ];

    protected $casts = [
        'status' => OrderStatus::class,
        'payment_method' => \App\Enums\PaymentMethod::class,
        'placed_at' => 'datetime',
        'accepted_at' => 'datetime',
        'delivered_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'cash_collected_at' => 'datetime',
        'subtotal' => 'float',
        'delivery_fee' => 'float',
        'total' => 'float',
        'cash_collected' => 'float',
        'frozen_service_boundary' => 'array',
    ];

    // ADDED: Automatically append can_cancel to JSON responses
    protected $appends = ['can_cancel'];

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function rider()
    {
        return $this->belongsTo(User::class, 'rider_id');
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function statusHistory()
    {
        return $this->hasMany(OrderStatusHistory::class);
    }

    public function paymentRecord()
    {
        return $this->hasOne(PaymentRecord::class);
    }

    public function dispatchAttempts()
    {
        return $this->hasMany(DispatchAttempt::class);
    }

    public function rating()
    {
        return $this->hasOne(Rating::class);
    }

    // ADDED: The cancellation logic
    public function getCanCancelAttribute()
    {
        // 1. Cannot cancel if it's already finished or picked up
        $blockedStatuses = ['picked_up', 'delivered', 'cancelled', 'rejected', 'no_rider'];
        if (in_array($this->status->value, $blockedStatuses)) {
            return false;
        }

        // 2. Always cancel if it's still PENDING (restaurant hasn't accepted)
        if ($this->status->value === 'pending') {
            return true;
        }

        // 3. If accepted, check the timers
        if ($this->accepted_at) {
            $minutesSinceAccept = now()->diffInMinutes($this->accepted_at);
            
            // Get the prep time the restaurant entered (default to 15 if not found)
            $acceptHistory = $this->statusHistory()->where('to_status', 'accepted')->latest('id')->first();
            $prepMinutes = $acceptHistory->meta['prep_minutes'] ?? 15; 

            // Calculate if the order is officially "Delayed" 
            // (Prep time + 15 minutes grace period for rider)
            $isDelayed = $minutesSinceAccept > ($prepMinutes + 15);

            // Allow cancellation if within the 5-minute window OR if it's delayed
            return $minutesSinceAccept <= 5 || $isDelayed;
        }

        return false;
    }
}