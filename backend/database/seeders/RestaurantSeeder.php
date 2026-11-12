<?php

namespace Database\Seeders;

use App\Models\Restaurant;
use Illuminate\Database\Seeder;

class RestaurantSeeder extends Seeder
{
    public function run(): void
    {
        // Approved Main Restaurant
        Restaurant::updateOrCreate(
            ['name' => 'Baumbach-Lehner Kitchen'],
            [
                'address' => '457 Noemie Court, Stokesfurt',
                'phone' => '09948823241',
                'service_boundary' => [
                    'lat_center' => 14.5995,
                    'lng_center' => 120.9842,
                    'lat_min' => 14.5500,
                    'lat_max' => 14.6500,
                    'lng_min' => 120.9400,
                    'lng_max' => 121.0300,
                    'radius_km' => 5,
                ],
                'is_open' => true,
                'is_disabled' => false,
            ]
        );

        // Additional active restaurant
        Restaurant::updateOrCreate(
            ['name' => 'Rohan-Mante Kitchen'],
            [
                'address' => '104 Israel Corners, Rathburgh',
                'phone' => '09656560072',
                'service_boundary' => [
                    'lat_center' => 14.5995,
                    'lng_center' => 120.9842,
                    'lat_min' => 14.5500,
                    'lat_max' => 14.6500,
                    'lng_min' => 120.9400,
                    'lng_max' => 121.0300,
                    'radius_km' => 5,
                ],
                'is_open' => true,
                'is_disabled' => false,
            ]
        );

        // Temporarily closed restaurant
        Restaurant::updateOrCreate(
            ['name' => 'Closed Kitchen'],
            [
                'address' => '85207 Altenwerth Manors',
                'phone' => '09468007586',
                'service_boundary' => null,
                'is_open' => false,
                'is_disabled' => false,
            ]
        );

        // Admin-disabled restaurant
        Restaurant::updateOrCreate(
            ['name' => 'Disabled Kitchen'],
            [
                'address' => '5677 Stroman Stream',
                'phone' => '09100586093',
                'service_boundary' => null,
                'is_open' => true,
                'is_disabled' => true,
            ]
        );
    }
}
