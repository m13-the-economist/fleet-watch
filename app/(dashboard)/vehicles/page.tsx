"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Car, Bike, Truck, Eye } from "lucide-react";
import Link from "next/link";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    fetchVehicles();
  }, []);

  async function fetchVehicles() {
    const { data } = await supabase.from("vehicles").select("*");
    if (data) setVehicles(data);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Vehicles</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle: any) => (
          <Card key={vehicle.id} className="bg-[#0A0A0A] border-[#1A1A1A] p-6">
            <h3 className="text-lg font-bold text-white">{vehicle.plate_number}</h3>
            <p className="text-[#6B7280]">Temp: {vehicle.last_temperature || "--"}°C</p>
            <p className="text-[#6B7280]">Voltage: {vehicle.last_voltage || "--"}V</p>
            <p className="text-[#6B7280]">Status: {vehicle.status || "offline"}</p>
            <Link href={`/dashboard/vehicles/${vehicle.id}`}>
              <Button className="mt-4 w-full">View Details</Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
