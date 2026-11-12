<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Unpaid                = 'unpaid';
    case Pending               = 'pending';
    case CollectedByRider      = 'collected_by_rider';
    case Collected             = 'collected';
    case RemittedToAdmin       = 'remitted_to_admin';
    case SettledToRestaurant   = 'settled_to_restaurant';
    case Settled               = 'settled';
    case FlaggedDiscrepancy    = 'flagged_discrepancy';
    case Failed                = 'failed';

    public function toContract(): string
    {
        return match ($this) {
            self::Unpaid              => 'UNPAID',
            self::Pending             => 'UNPAID',
            self::CollectedByRider    => 'COLLECTED_BY_RIDER',
            self::Collected           => 'COLLECTED_BY_RIDER',
            self::RemittedToAdmin     => 'REMITTED_TO_ADMIN',
            self::SettledToRestaurant => 'SETTLED_TO_RESTAURANT',
            self::Settled             => 'SETTLED_TO_RESTAURANT',
            self::FlaggedDiscrepancy  => 'FLAGGED_DISCREPANCY',
            self::Failed              => 'FAILED',
        };
    }
}
