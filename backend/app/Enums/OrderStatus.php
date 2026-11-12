<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Pending        = 'pending';
    case Accepted       = 'accepted';
    case Rejected       = 'rejected';
    case Preparing      = 'preparing';
    case Ready          = 'ready';
    case SearchingRider = 'searching_rider';
    case PickedUp       = 'picked_up';
    case Delivered      = 'delivered';
    case Cancelled      = 'cancelled';
    case NoRider        = 'no_rider';

    public function toContract(): string
    {
        return match ($this) {
            self::Pending        => 'PENDING',
            self::Accepted       => 'ACCEPTED',
            self::Rejected       => 'REJECTED',
            self::Preparing      => 'PREPARING',
            self::Ready          => 'READY',
            self::SearchingRider => 'SEARCHING_RIDER',
            self::PickedUp       => 'PICKED_UP',
            self::Delivered      => 'DELIVERED',
            self::Cancelled      => 'CANCELLED',
            self::NoRider        => 'NO_RIDER',
        };
    }
}
