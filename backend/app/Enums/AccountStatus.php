<?php

namespace App\Enums;

enum AccountStatus: string
{
    case Pending  = 'pending';
    case Approved = 'approved';
    case Disabled = 'disabled';

    public function toContract(): string
    {
        return match ($this) {
            self::Pending  => 'PENDING_APPROVAL',
            self::Approved => 'APPROVED',
            self::Disabled => 'DISABLED',
        };
    }
}
