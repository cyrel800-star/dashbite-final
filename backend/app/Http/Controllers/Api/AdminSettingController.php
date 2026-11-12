<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SettingService;
use Illuminate\Http\Request;

class AdminSettingController extends Controller
{
    public function __construct(private SettingService $settings)
    {
    }

    public function showSettings()
    {
        return response()->json([
            'data' => [
                'delivery_fee'     => $this->settings->getDeliveryFee(),
                'service_boundary' => $this->settings->getServiceBoundary(),
            ],
        ]);
    }

    public function updateFee(Request $request)
    {
        $data = $request->validate([
            'delivery_fee' => ['required', 'numeric', 'min:0', 'max:500'],
        ]);

        $newFee = $this->settings->setDeliveryFee((float) $data['delivery_fee']);

        return response()->json([
            'message' => 'Delivery fee updated.',
            'data'    => ['delivery_fee' => $newFee],
        ]);
    }

    /**
     * REQ-08 AC #1: Admin updates service boundary.
     */
    public function updateBoundary(Request $request)
    {
        $data = $request->validate([
            'lat_center' => ['required', 'numeric', 'between:-90,90'],
            'lng_center' => ['required', 'numeric', 'between:-180,180'],
            'radius_km'  => ['nullable', 'numeric', 'min:1', 'max:50'],
            'lat_min'    => ['nullable', 'numeric', 'between:-90,90'],
            'lat_max'    => ['nullable', 'numeric', 'between:-90,90'],
            'lng_min'    => ['nullable', 'numeric', 'between:-180,180'],
            'lng_max'    => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $newBoundary = $this->settings->setServiceBoundary($data);

        return response()->json([
            'message' => 'Service boundary updated.',
            'data'    => ['service_boundary' => $newBoundary],
        ]);
    }
}
