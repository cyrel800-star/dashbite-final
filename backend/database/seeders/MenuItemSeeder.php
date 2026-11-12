<?php

namespace Database\Seeders;

use App\Models\MenuItem;
use App\Models\Restaurant;
use Illuminate\Database\Seeder;

class MenuItemSeeder extends Seeder
{
    public function run(): void
    {
        $restaurants = Restaurant::orderable()->get();

        foreach ($restaurants as $restaurant) {
            $items = [
                ['name' => 'Burger Classic', 'description' => 'Juicy grilled beef patty with fresh lettuce and sauce', 'price' => 120.00, 'is_available' => true],
                ['name' => 'Pizza Pepperoni', 'description' => 'Classic crust with pepperoni slices and mozzarella', 'price' => 180.00, 'is_available' => true],
                ['name' => 'Chicken Noodles', 'description' => 'Savory egg noodles topped with shredded chicken', 'price' => 150.00, 'is_available' => true],
                ['name' => 'Chicken Wings', 'description' => 'Crispy fried wings tossed in sweet and spicy sauce', 'price' => 200.00, 'is_available' => true],
                ['name' => 'Kare-Kare', 'description' => 'Rich peanut stew with tender beef and vegetables', 'price' => 340.00, 'is_available' => true],
                ['name' => 'Sold Out Item', 'description' => 'Special daily item currently unavailable', 'price' => 160.00, 'is_available' => false],
            ];

            foreach ($items as $item) {
                MenuItem::updateOrCreate(
                    [
                        'restaurant_id' => $restaurant->id,
                        'name' => $item['name'],
                    ],
                    [
                        'description' => $item['description'],
                        'price' => $item['price'],
                        'is_available' => $item['is_available'],
                    ]
                );
            }
        }
    }
}
