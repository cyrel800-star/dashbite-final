<?php

namespace App\Enums;

enum UserRole: string
{
    case Customer   = 'customer';
    case Restaurant = 'restaurant';
    case Rider      = 'rider';
    case Admin      = 'admin';

    public function toContract(): string
    {
        return match ($this) {
            self::Customer   => 'CUSTOMER',
            self::Restaurant => 'RESTAURANT',
            self::Rider      => 'RIDER',
            self::Admin      => 'ADMIN',
        };
    }
}
