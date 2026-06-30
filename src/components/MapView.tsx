import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { Play, Square, Crosshair, Flame, Timer, CloudRain, Droplets, Thermometer, HeartPulse, Activity, Layers, Camera, X, LocateFixed } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, YAxis, ResponsiveContainer } from "recharts";
import Webcam from "react-webcam";
import { SpotifyPlayer } from "./SpotifyPlayer";
import api from "@/lib/api";

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; // Distance in km
}

const MAP_STYLES = {
  standard: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
  topographic: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
  }
};

type MapLayerType = keyof typeof MAP_STYLES;

function MapUpdater({ center, isFollowing }: { center: [number, number] | null; isFollowing: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (center && isFollowing) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, isFollowing, map]);
  return null;
}

export function MapView() {
  const [mapLayer, setMapLayer] = useState<MapLayerType>("standard");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState(0); // km
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [weather, setWeather] = useState<{temp: number, humidity: number, precip: number} | null>(null);
  const [hrvDevice, setHrvDevice] = useState<any>(null);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [isConnectingHR, setIsConnectingHR] = useState(false);
  const [isSimulatingHR, setIsSimulatingHR] = useState(false);
  const [hrHistory, setHrHistory] = useState<{ elapsed: number; bpm: number }[]>([]);
  const [pinnedPhotos, setPinnedPhotos] = useState<{ id: string; lat: number; lng: number; uri: string }[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isSimulatingHRRef = useRef(isSimulatingHR);

  useEffect(() => {
    isSimulatingHRRef.current = isSimulatingHR;
  }, [isSimulatingHR]);

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc && position) {
      setPinnedPhotos(prev => [...prev, {
        id: Date.now().toString(),
        lat: position[0],
        lng: position[1],
        uri: imageSrc
      }]);
      setIsCameraOpen(false);
    }
  }, [webcamRef, position]);

  const [activityType, setActivityType] = useState<"Run" | "Ride">("Run");
  const [hasRecordedRoute, setHasRecordedRoute] = useState(false);

  const handleStop = () => {
    setIsTracking(false);
    setHasRecordedRoute(true);
  };

  const handleSaveActivity = async () => {
    try {
      const payload = {
        activityType,
        distance,
        duration: elapsedSeconds,
        path: route.map(p => ({ lat: p[0], lng: p[1], time: new Date() })),
        startTime: new Date(startTimeRef.current || Date.now()),
        endTime: new Date()
      };
      
      await api.post('/workouts', payload);
      
      setRoute([]);
      setDistance(0);
      setElapsedSeconds(0);
      setHasRecordedRoute(false);
      alert('Activity Route Saved successfully!');
    } catch (err: any) {
      alert('Failed to save workout: ' + (err.response?.data?.error || err.message));
    }
  };

  const connectHR = async () => {
    if (!('bluetooth' in navigator)) {
      alert("Web Bluetooth API is not supported in this browser. Please use Chrome on Desktop or Android.");
      return;
    }
    
    setIsConnectingHR(true);
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
      });
      
      setHrvDevice(device);
      const server = await device.gatt?.connect();
      if (!server) throw new Error("Could not connect to GATT server");
      
      const service = await server.getPrimaryService('heart_rate');
      const characteristic = await service.getCharacteristic('heart_rate_measurement');
      
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', (e: any) => {
        const value = e.target.value;
        if (!value) return;
        const flags = value.getUint8(0);
        const rate16Bits = flags & 0x1;
        const hr = rate16Bits ? value.getUint16(1, true) : value.getUint8(1);
        setHeartRate(hr);
        setHrHistory(prev => [...prev.slice(-30), { elapsed: Date.now(), bpm: hr }]);
      });
      
      device.addEventListener('gattserverdisconnected', () => {
        setHrvDevice(null);
        setHeartRate(null);
      });
    } catch (err: any) {
      console.error("BLE HR connection error:", err);
      const errMsg = err?.message || String(err);
      if (errMsg.includes("permissions policy") || errMsg.includes("disallowed by permissions policy") || err?.name === "SecurityError") {
        alert("Bluetooth access is blocked by the iframe sandbox/permission policy inside the preview pane. Please click 'Open in new tab' in the top-right corner to open the app directly and connect your Bluetooth Heart Rate monitor!");
      } else {
        alert(`Bluetooth connection error: ${errMsg}`);
      }
    } finally {
      setIsConnectingHR(false);
    }
  };

  useEffect(() => {
    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    let watchId: number;
    if (isTracking) {
      setRoute([]); // Reset route
      setDistance(0);
      setElapsedSeconds(0);
      setHrHistory([]);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const currentElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedSeconds(currentElapsed);
          
          if (isSimulatingHRRef.current) {
            const baseHR = 120 + Math.min(currentElapsed / 10, 30); // HR increases over time
            const variation = Math.floor(Math.random() * 10) - 5;
            const newHR = Math.floor(baseHR + variation);
            setHeartRate(newHR);
            setHrHistory(prev => [...prev.slice(-30), { elapsed: currentElapsed, bpm: newHR }]);
          }
        }
      }, 1000);

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPos);
          setRoute((prev) => {
            if (prev.length > 0) {
              const lastPos = prev[prev.length - 1];
              const dist = calculateDistance(lastPos[0], lastPos[1], newPos[0], newPos[1]);
              setDistance(d => d + dist);
            }
            return [...prev, newPos];
          });
        },
        (err) => console.error(err),
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTracking]);

  useEffect(() => {
    if (position && !weather) {
      const [lat, lng] = position;
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation`)
        .then(res => res.json())
        .then(data => {
          if (data && data.current) {
            setWeather({
              temp: data.current.temperature_2m,
              humidity: data.current.relative_humidity_2m,
              precip: data.current.precipitation
            });
          }
        })
        .catch(err => console.error("Weather API error:", err));
    }
  }, [position, weather]);

  let paceText = "--:--";
  if (distance > 0.02) { // Need at least 20 meters to measure pace reliably
    const paceMinutes = (elapsedSeconds / 60) / distance;
    if (paceMinutes < 60) { // realistic pace
      const pMin = Math.floor(paceMinutes);
      const pSec = Math.floor((paceMinutes - pMin) * 60);
      paceText = `${pMin}:${pSec.toString().padStart(2, '0')}`;
    }
  }

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const calories = Math.floor(distance * 70); // Rough estimate: 70 kcal per km

  if (!position) {
    return (
      <div className="h-full w-full flex items-center justify-center flex-col text-brand-text-secondary pb-20">
        <Crosshair className="w-10 h-10 mb-4 animate-pulse text-brand-surface-light" />
        <p className="font-medium animate-pulse">Acquiring GPS Signal...</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-[#111] flex flex-col">
      <div className="flex-1 relative z-0">
        <MapContainer 
          center={position} 
          zoom={16} 
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
          className="pb-[70px] md:pb-0" // Account for mobile nav
        >
          <MapUpdater center={position} isFollowing={isFollowing} />
          <TileLayer
            key={mapLayer} // Force re-render when layer changes
            attribution={MAP_STYLES[mapLayer].attribution}
            url={MAP_STYLES[mapLayer].url}
            className={mapLayer === "standard" ? "map-tiles-dark" : ""}
          />
          <Marker position={position}>
            <Popup>Current Location</Popup>
          </Marker>
          
          {pinnedPhotos.map(photo => (
            <Marker key={photo.id} position={[photo.lat, photo.lng]}>
              <Popup className="photo-popup">
                <div className="w-32 rounded-md overflow-hidden shadow-lg border-2 border-[#21D4B5]">
                  <img src={photo.uri} alt="Pinned moment" className="w-full h-auto" />
                </div>
              </Popup>
            </Marker>
          ))}
          
          {route.length > 1 && <Polyline positions={route} color={mapLayer === "satellite" ? "#00FFDD" : "#d4ff00"} weight={4} />}
        </MapContainer>
      </div>

      <div className="absolute bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3">
        {!isTracking && !hasRecordedRoute && (
          <div className="flex bg-[rgba(33,33,33,0.85)] backdrop-blur-md rounded-full p-1 border border-[rgba(255,255,255,0.05)] shadow-xl mb-2">
            <button
              onClick={() => setActivityType("Run")}
              className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", activityType === "Run" ? "bg-[#2A2D3A] text-brand-text-primary" : "text-brand-text-secondary hover:text-white")}
            >
              Run
            </button>
            <button
              onClick={() => setActivityType("Ride")}
              className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", activityType === "Ride" ? "bg-[#2A2D3A] text-brand-text-primary" : "text-brand-text-secondary hover:text-white")}
            >
              Ride
            </button>
          </div>
        )}
        
        <div className="flex items-center gap-4 bg-[rgba(33,33,33,0.85)] backdrop-blur-md p-1.5 rounded-full border border-[rgba(255,255,255,0.05)] shadow-xl">
          {hasRecordedRoute && !isTracking ? (
            <>
              <button 
                onClick={() => {
                  setRoute([]);
                  setDistance(0);
                  setElapsedSeconds(0);
                  setHasRecordedRoute(false);
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold tracking-wide text-[13px] transition-all bg-red-500/10 text-red-500 hover:bg-red-500/20"
              >
                Discard
              </button>
              <button 
                onClick={handleSaveActivity}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold tracking-wide text-[13px] transition-all bg-[#34C759] text-white hover:bg-[#2eaa4c]"
              >
                Save {activityType}
              </button>
            </>
          ) : (
            <button 
              onClick={() => {
                if (isTracking) {
                  handleStop();
                } else {
                  setHasRecordedRoute(false);
                  setIsTracking(true);
                }
              }}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold tracking-wide text-[13px] transition-all",
                isTracking 
                  ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" 
                  : "bg-brand-accent text-[#1e1e1e] hover:bg-[#b0d800] shadow-[0_0_15px_rgba(212,255,0,0.2)]"
              )}
            >
              {isTracking ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              {isTracking ? "STOP" : "START"}
            </button>
          )}
        </div>
      </div>
      
      {/* HUD Stats overlay (Real Data) */}
      {isTracking && (
        <div className="absolute top-6 left-0 right-0 z-10 flex gap-2 sm:gap-3 px-4 justify-center pointer-events-none">
          <div className="bg-[rgba(33,33,33,0.85)] backdrop-blur-md px-4 py-2 sm:px-5 sm:py-2.5 rounded-md text-center border border-[rgba(255,255,255,0.05)] flex-1 max-w-[110px] shadow-sm">
            <div className="text-[10px] text-brand-text-secondary uppercase font-semibold tracking-widest mb-0.5 flex flex-col items-center">
              <Timer className="w-3 h-3 mb-0.5" /> Time
            </div>
            <div className="text-sm font-mono text-brand-text-primary font-bold">{formatTime(elapsedSeconds)}</div>
          </div>
          <div className="bg-[rgba(33,33,33,0.85)] backdrop-blur-md px-4 py-2 sm:px-5 sm:py-2.5 rounded-md text-center border border-brand-accent/20 flex-1 max-w-[130px] shadow-[0_0_15px_rgba(212,255,0,0.05)]">
            <div className="text-[10px] text-brand-text-secondary uppercase font-semibold tracking-widest mb-0.5">Distance</div>
            <div className="text-lg font-mono text-brand-accent font-bold">{distance.toFixed(2)} <span className="text-[10px] text-brand-accent/70 ml-0.5">KM</span></div>
          </div>
          <div className="bg-[rgba(33,33,33,0.85)] backdrop-blur-md px-4 py-2 sm:px-5 sm:py-2.5 rounded-md text-center border border-[rgba(255,255,255,0.05)] flex-1 max-w-[110px] hidden sm:block shadow-sm">
            <div className="text-[10px] text-brand-text-secondary uppercase font-semibold tracking-widest mb-0.5">Pace</div>
            <div className="text-sm font-mono text-brand-text-primary font-bold">{paceText} <span className="text-[10px] text-brand-text-secondary ml-0.5">/KM</span></div>
          </div>
          {heartRate ? (
            <div className="bg-[rgba(33,33,33,0.85)] backdrop-blur-md px-4 py-2 sm:px-5 sm:py-2.5 rounded-md text-center border border-red-500/20 flex-1 max-w-[110px] shadow-[0_0_15px_rgba(220,38,38,0.05)] relative overflow-hidden">
              {hrHistory.length > 0 && (
                <div className="absolute inset-0 opacity-30 pointer-events-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hrHistory}>
                      <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
                      <Line type="monotone" dataKey="bpm" stroke="#EF4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="relative z-10">
                <div className="text-[10px] text-red-500 uppercase font-semibold tracking-widest mb-0.5 flex flex-col items-center">
                   <HeartPulse className="w-3 h-3 mb-0.5 text-red-500" /> HR
                </div>
                <div className="text-sm font-mono text-red-400 font-bold">{heartRate} <span className="text-[10px] text-red-400/70 ml-0.5">BPM</span></div>
              </div>
            </div>
          ) : (
            <div className="bg-[rgba(33,33,33,0.85)] backdrop-blur-md px-4 py-2 sm:px-5 sm:py-2.5 rounded-md text-center border border-[rgba(255,255,255,0.05)] flex-1 max-w-[110px] shadow-sm">
              <div className="text-[10px] text-orange-400 uppercase font-semibold tracking-widest mb-0.5 flex flex-col items-center">
                 <Flame className="w-3 h-3 mb-0.5 text-orange-400" /> Cals
              </div>
              <div className="text-sm font-mono text-orange-400 font-bold">{calories}</div>
            </div>
          )}
        </div>
      )}

      {/* Utilities Overlay (Weather & HR Connect) */}
      <div className="absolute top-24 sm:top-24 right-4 z-10 flex flex-col gap-3 pointer-events-auto">
        <button 
          onClick={() => setIsFollowing(!isFollowing)}
          className={cn(
            "p-2.5 rounded-md border shadow-sm flex items-center justify-center transition-colors cursor-pointer backdrop-blur-md",
            isFollowing 
              ? "bg-[rgba(33,212,181,0.15)] border-[rgba(33,212,181,0.3)] text-[#21D4B5]" 
              : "bg-[rgba(33,33,33,0.85)] border-[rgba(255,255,255,0.05)] text-brand-text-secondary hover:text-brand-text-primary hover:bg-[#333]"
          )}
          title={isFollowing ? "Follow Me: ON" : "Follow Me: OFF"}
        >
          <LocateFixed className="w-4 h-4" />
        </button>

        <div className="relative">
          <button 
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="bg-[rgba(33,33,33,0.85)] backdrop-blur-md p-2.5 rounded-md border border-[rgba(255,255,255,0.05)] shadow-sm flex items-center justify-center hover:bg-[#333] transition-colors cursor-pointer text-brand-text-primary"
            title="Map Layers"
          >
            <Layers className="w-4 h-4 text-brand-text-secondary hover:text-brand-text-primary transition-colors" />
          </button>
          
          {showLayerMenu && (
            <div className="absolute top-0 right-12 w-36 bg-[rgba(33,33,33,0.95)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-md shadow-2xl overflow-hidden flex flex-col z-20">
              {(Object.keys(MAP_STYLES) as MapLayerType[]).map((layer) => (
                <button
                  key={layer}
                  onClick={() => {
                    setMapLayer(layer);
                    setShowLayerMenu(false);
                  }}
                  className={cn(
                    "px-3 py-2 text-xs font-medium text-left transition-colors hover:bg-[rgba(255,255,255,0.05)] capitalize",
                    mapLayer === layer ? "text-brand-accent bg-[rgba(255,255,255,0.02)]" : "text-brand-text-secondary"
                  )}
                >
                  {layer}
                </button>
              ))}
            </div>
          )}
        </div>

        {!hrvDevice && !isSimulatingHR && (
          <div className="flex flex-col gap-2">
            <button 
              onClick={connectHR}
              disabled={isConnectingHR}
              className="bg-[rgba(33,33,33,0.85)] backdrop-blur-md p-2.5 rounded-md border border-[rgba(255,255,255,0.05)] shadow-sm flex items-center justify-center hover:bg-[#333] transition-colors cursor-pointer text-brand-text-primary"
              title="Connect Heart Rate Monitor"
            >
              {isConnectingHR ? <Activity className="w-4 h-4 animate-spin text-brand-accent" /> : <HeartPulse className="w-4 h-4 text-red-400 hover:scale-110 transition-transform" />}
            </button>
            <button 
              onClick={() => {
                setIsSimulatingHR(true);
                setHeartRate(120); // Initial simulated HR
              }}
              className="bg-[rgba(33,33,33,0.85)] backdrop-blur-md p-2.5 rounded-md border border-[rgba(255,255,255,0.05)] shadow-sm flex items-center justify-center hover:bg-[#333] transition-colors cursor-pointer text-brand-text-primary"
              title="Simulate Heart Rate"
            >
              <Activity className="w-4 h-4 text-orange-400 hover:scale-110 transition-transform" />
            </button>
          </div>
        )}
        
        {isSimulatingHR && (
          <button 
            onClick={() => {
              setIsSimulatingHR(false);
              setHeartRate(null);
              setHrHistory([]);
            }}
            className="bg-[rgba(33,33,33,0.85)] backdrop-blur-md p-2.5 rounded-md border border-red-500/50 shadow-sm flex items-center justify-center hover:bg-[#333] transition-colors cursor-pointer text-red-400"
            title="Stop Simulating Heart Rate"
          >
            <Square className="w-4 h-4 hover:scale-110 transition-transform" />
          </button>
        )}

        {isTracking && (
          <button 
            onClick={() => setIsCameraOpen(true)}
            className="bg-[rgba(33,33,33,0.85)] backdrop-blur-md p-2.5 rounded-md border border-[rgba(255,255,255,0.05)] shadow-sm flex items-center justify-center hover:bg-[#333] transition-colors cursor-pointer text-[#21D4B5]"
            title="Take Photo"
          >
            <Camera className="w-4 h-4 hover:scale-110 transition-transform" />
          </button>
        )}
        
        {weather && (
          <div className="bg-[rgba(33,33,33,0.85)] backdrop-blur-md p-2.5 rounded-md border border-[rgba(255,255,255,0.05)] shadow-sm flex flex-col gap-2 pointer-events-none">
            <div className="flex items-center gap-2 text-[12px] text-brand-text-primary font-medium">
              <Thermometer className="w-3.5 h-3.5 text-orange-400" />
              {weather.temp.toFixed(1)}°C
            </div>
            <div className="flex items-center gap-2 text-[12px] text-brand-text-secondary font-medium">
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
              {weather.humidity}%
            </div>
            <div className="flex items-center gap-2 text-[12px] text-brand-text-secondary font-medium">
              <CloudRain className="w-3.5 h-3.5 text-brand-text-secondary" />
              {weather.precip.toFixed(1)} mm
            </div>
          </div>
        )}
      </div>

      {/* Spotify Player */}
      <div className="absolute bottom-28 sm:bottom-32 left-4 z-10">
        <SpotifyPlayer />
      </div>

      {/* Camera Overlay */}
      {isCameraOpen && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col">
          <div className="relative flex-1">
            {/* @ts-ignore */}
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full h-full object-cover"
              videoConstraints={{ facingMode: "environment" }}
            />
            <button
              onClick={() => setIsCameraOpen(false)}
              className="absolute top-6 right-6 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="h-32 bg-black flex items-center justify-center shrink-0">
            <button
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center"
            >
              <div className="w-12 h-12 bg-white rounded-full active:scale-95 transition-transform" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
