"use client";

import React, { useState, useEffect, useRef } from 'react';

// Declare global Radar object
declare global {
  interface Window {
    Radar: any;
  }
}

interface Location {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  type?: string;
  url?: string;
  description?: string;
}

interface LocationMapProps {
  locations: Location[];
  height?: number;
  zoom?: number;
}

export const LocationMap: React.FC<LocationMapProps> = ({
  locations,
  height = 400,
  zoom = 10
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [radarLoaded, setRadarLoaded] = useState(false);

  useEffect(() => {
    // Load Radar SDK dynamically
    if (!radarLoaded && typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://js.radar.com/v4.5.3/radar.min.js';
      script.async = true;
      script.onload = () => {
        const link = document.createElement('link');
        link.href = 'https://js.radar.com/v4.5.3/radar.css';
        link.rel = 'stylesheet';
        document.head.appendChild(link);

        const radarKey = process.env.NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY || 'prj_test_pk_1234567890abcdef1234567890abcdef12345678';
        window.Radar.initialize(radarKey);
        setRadarLoaded(true);
      };
      document.head.appendChild(script);
    }
  }, [radarLoaded]);

  useEffect(() => {
    if (!mapRef.current || !radarLoaded || !window.Radar || locations.length === 0) {
      return;
    }

    // Calculate center point
    const centerLat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
    const centerLng = locations.reduce((sum, loc) => sum + loc.lng, 0) / locations.length;

    // Create map
    const radarMap = window.Radar.ui.map({
      container: mapRef.current,
      style: 'radar-default-v1',
      center: [centerLng, centerLat],
      zoom: zoom,
    });

    // Add markers
    locations.forEach((location, index) => {
      const marker = window.Radar.ui.marker({
        color: '#2563eb', // Blue color
        popup: {
          html: `
            <div style="max-width: 200px;">
              <h3 style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${location.name}</h3>
              ${location.address ? `<p style="font-size: 12px; color: #666; margin-bottom: 4px;">${location.address}</p>` : ''}
              ${location.description ? `<p style="font-size: 12px; color: #333; margin-bottom: 8px;">${location.description}</p>` : ''}
              ${location.url ? `<a href="${location.url}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; color: #2563eb; text-decoration: underline;">Visit Website →</a>` : ''}
            </div>
          `,
        },
      })
      .setLngLat([location.lng, location.lat])
      .addTo(radarMap);
    });

    // Fit map to show all markers
    if (locations.length > 1) {
      radarMap.fitToMarkers({ padding: 40 });
    }

    setMap(radarMap);

    // Cleanup function
    return () => {
      if (radarMap) {
        // Clear all markers and features
        radarMap.clearMarkers();
        radarMap.clearFeatures();
      }
    };
  }, [locations, radarLoaded, zoom]);

  if (locations.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};