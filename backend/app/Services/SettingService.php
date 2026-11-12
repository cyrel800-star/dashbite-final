<?php

namespace App\Services;

use App\Models\Restaurant;
use App\Models\Setting;

class SettingService
{
    public const DELIVERY_FEE_KEY      = 'delivery_fee';
    public const SERVICE_BOUNDARY_KEY = 'service_boundary';

    public function getDeliveryFee(): float
    {
        return (float) Setting::get(self::DELIVERY_FEE_KEY, 30.00); // default 30
    }

    public function setDeliveryFee(float $fee): float
    {
        Setting::set(self::DELIVERY_FEE_KEY, $fee);
        return $fee;
    }

    public function getServiceBoundary(): array
    {
        $raw = Setting::get(self::SERVICE_BOUNDARY_KEY);
        if ($raw) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return [
            'lat_center' => 14.5995,
            'lng_center' => 120.9842,
            'lat_min'    => 14.5500,
            'lat_max'    => 14.6500,
            'lng_min'    => 120.9400,
            'lng_max'    => 121.0300,
            'radius_km'  => 5,
        ];
    }

    public function setServiceBoundary(array $boundary): array
    {
        Setting::set(self::SERVICE_BOUNDARY_KEY, json_encode($boundary));

        // Sync boundary to restaurants that don't have custom ones
        Restaurant::query()->update(['service_boundary' => $boundary]);

        return $boundary;
    }
}
