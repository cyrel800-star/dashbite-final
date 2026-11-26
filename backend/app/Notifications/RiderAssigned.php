<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\Order;
use App\Models\User;

class RiderAssigned extends Notification
{
    use Queueable;

    public $order;
    public $rider;

    public function __construct(Order $order, User $rider)
    {
        $this->order = $order;
        $this->rider = $rider;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'title' => 'Rider Assigned',
            'message' => "{$this->rider->name} has been assigned to order #{$this->order->id}.",
            'icon' => 'user',
        ];
    }
}