import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { area as turfArea, length as turfLength } from '@turf/turf';

// Safely configure Leaflet default marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

try {
  if (L && L.Icon && L.Icon.Default && L.Icon.Default.prototype) {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: markerIcon,
      iconRetinaUrl: markerIcon2x,
      shadowUrl: markerShadow,
    });
  }
} catch (err) {
  console.warn('Leaflet icon initialization notice:', err);
}

// Custom Vertex Icons
const createFirstVertexIcon = (canClose) => {
  return L.divIcon({
    className: 'custom-vertex-handle',
    html: `<div class="vertex-node-point ${canClose ? 'vertex-first-node' : ''}" style="
      width: ${canClose ? '26px' : '20px'};
      height: ${canClose ? '26px' : '20px'};
      background: ${canClose ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#10b981'};
      border: 2px solid #ffffff;
      box-shadow: 0 0 12px ${canClose ? '#10b981' : 'rgba(0,0,0,0.5)'};
      color: #ffffff;
      font-size: 11px;
      cursor: ${canClose ? 'pointer' : 'default'};
    ">1</div>`,
    iconSize: canClose ? [26, 26] : [20, 20],
    iconAnchor: canClose ? [13, 13] : [10, 10],
  });
};

const createIntermediateVertexIcon = (index, isLast) => {
  return L.divIcon({
    className: 'custom-vertex-handle',
    html: `<div class="vertex-node-point" style="
      width: ${isLast ? '20px' : '16px'};
      height: ${isLast ? '20px' : '16px'};
      background: ${isLast ? '#06b6d4' : '#38bdf8'};
      border: 2px solid #ffffff;
      box-shadow: 0 0 8px rgba(0,0,0,0.6);
      color: #ffffff;
      font-size: 10px;
    ">${index + 1}</div>`,
    iconSize: isLast ? [20, 20] : [16, 16],
    iconAnchor: isLast ? [10, 10] : [8, 8],
  });
};

const createCursorReticleIcon = (nextPointNum) => {
  return L.divIcon({
    className: 'custom-cursor-handle',
    html: `<div style="position: relative; pointer-events: none;">
      <div class="cursor-live-reticle"></div>
      <div class="cursor-live-ping"></div>
      <div style="
        position: absolute;
        left: 20px;
        top: -10px;
        background: rgba(15, 23, 42, 0.92);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.5);
        border-radius: 6px;
        padding: 2px 7px;
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      ">Point ${nextPointNum} (Click)</div>
    </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
};

function MapViewController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      try {
        map.flyTo(center, zoom || 16, { duration: 1.2 });
      } catch (e) {
        console.warn('FlyTo notice:', e);
      }
    }
  }, [center, zoom, map]);
  return null;
}

function MapEventsHandler({ isDrawing, onAddPoint, onMouseMove }) {
  useMapEvents({
    click(e) {
      if (isDrawing && e && e.latlng) {
        onAddPoint([e.latlng.lat, e.latlng.lng]);
      }
    },
    mousemove(e) {
      if (isDrawing && e && e.latlng) {
        onMouseMove([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

export default function Map({
  center = [11.2189, 78.1674],
  zoom = 16,
  markerPosition = [11.2189, 78.1674],
  mapLayer = 'google_hybrid',
  setMapLayer = () => {},
  onPolygonChange = () => {},
  eeMapTiles = null,
  selectedDate = null,
  externalPolygon = null,
}) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [completedPolygon, setCompletedPolygon] = useState(null);
  const [liveMousePos, setLiveMousePos] = useState(null);

  // Sync with external saved farm selection
  useEffect(() => {
    if (externalPolygon && externalPolygon.geometry && externalPolygon.geometry.coordinates) {
      const ring = externalPolygon.geometry.coordinates[0];
      if (ring && ring.length >= 3) {
        const pts = ring.slice(0, -1).map((coord) => [coord[1], coord[0]]);
        setPoints(pts);
        setCompletedPolygon(pts);
        setIsDrawing(false);
        setLiveMousePos(null);
      }
    } else if (!externalPolygon && points.length > 0 && !isDrawing) {
      setPoints([]);
      setCompletedPolygon(null);
      setLiveMousePos(null);
    }
  }, [externalPolygon]);

  // Live Turf calculations for toolbar during active drawing
  const liveStats = useMemo(() => {
    if (points.length < 3) return null;
    try {
      const geojsonCoords = points.map((p) => [p[1], p[0]]);
      geojsonCoords.push([points[0][1], points[0][0]]);
      const geojsonFeature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [geojsonCoords],
        },
        properties: {},
      };
      const areaSqMeters = turfArea(geojsonFeature);
      const acres = areaSqMeters / 4046.8564224;
      const perimeterMeters = turfLength(geojsonFeature, { units: 'kilometers' }) * 1000;
      return { acres, areaSqMeters, perimeterMeters };
    } catch {
      return null;
    }
  }, [points]);

  const handleStartDrawing = () => {
    setPoints([]);
    setCompletedPolygon(null);
    setLiveMousePos(null);
    setIsDrawing(true);
    onPolygonChange(null);
  };

  const handleAddPoint = (newPt) => {
    const updated = [...points, newPt];
    setPoints(updated);
  };

  const handleMouseMove = (mousePt) => {
    setLiveMousePos(mousePt);
  };

  const handleUndoPoint = () => {
    if (points.length === 0) return;
    const updated = points.slice(0, points.length - 1);
    setPoints(updated);
    setCompletedPolygon(null);
  };

  const handleClearDrawing = () => {
    setPoints([]);
    setCompletedPolygon(null);
    setLiveMousePos(null);
    setIsDrawing(false);
    onPolygonChange(null);
  };

  const handleFinishPolygon = () => {
    if (points.length < 3) {
      alert('A farm boundary must have at least 3 points. Keep clicking points to trace your farm!');
      return;
    }

    setCompletedPolygon(points);
    setIsDrawing(false);
    setLiveMousePos(null);
    calculateAndEmitPolygon(points, true);
  };

  const calculateAndEmitPolygon = (pts, isFinal) => {
    try {
      const geojsonCoords = pts.map((p) => [p[1], p[0]]);
      geojsonCoords.push([pts[0][1], pts[0][0]]);

      const geojsonFeature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [geojsonCoords],
        },
        properties: {},
      };

      const areaSqMeters = turfArea(geojsonFeature);
      const hectares = areaSqMeters / 10000;
      const acres = areaSqMeters / 4046.8564224;
      const perimeterMeters = turfLength(geojsonFeature, { units: 'kilometers' }) * 1000;

      onPolygonChange({
        geojson: geojsonFeature,
        area: {
          sqMeters: areaSqMeters,
          hectares: hectares,
          acres: acres,
        },
        perimeterMeters: perimeterMeters,
        isFinal: isFinal,
      });
    } catch (e) {
      console.error('Polygon area calculation notice:', e);
    }
  };

  const validCenter = Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1]) ? center : [11.2189, 78.1674];

  return (
    <div className="map-container-box">
      {/* Map Control Header Toolbar */}
      <div className="map-toolbar-header">
        <div className="map-tools-left">
          {!isDrawing && !completedPolygon && (
            <button
              className="tool-btn primary-draw"
              onClick={handleStartDrawing}
            >
              ✏️ Start Drawing Farm Boundary
            </button>
          )}

          {isDrawing && (
            <>
              <button className="tool-btn active-draw" style={{ pointerEvents: 'none' }}>
                📍 Click Boundary Points (Placed: {points.length})
              </button>

              {liveStats && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '8px',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.85rem',
                  color: '#34d399',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <span>📐</span>
                  <span>{liveStats.acres.toFixed(2)} Acres</span>
                  <span style={{ color: '#94a3b8', fontWeight: '400' }}>({Math.round(liveStats.perimeterMeters)}m perim)</span>
                </div>
              )}

              <button
                className="tool-btn secondary-tool"
                onClick={handleUndoPoint}
                disabled={points.length === 0}
              >
                ↩️ Undo Point
              </button>

              <button
                className="tool-btn primary-draw"
                onClick={handleFinishPolygon}
                disabled={points.length < 3}
                style={{
                  background: points.length >= 3 ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : '#475569',
                  cursor: points.length >= 3 ? 'pointer' : 'not-allowed'
                }}
              >
                ✅ Finish Boundary ({points.length} Points)
              </button>
            </>
          )}

          {(points.length > 0 || completedPolygon) && (
            <button className="tool-btn secondary-tool" onClick={handleClearDrawing}>
              🧹 Clear & Start Over
            </button>
          )}
        </div>

        {/* Tile Layer Selector */}
        <div className="map-layer-selector">
          {eeMapTiles?.rgb && (
            <button
              className={`layer-chip ${mapLayer === 'ee_rgb' ? 'active' : ''}`}
              onClick={() => setMapLayer('ee_rgb')}
              style={{
                borderColor: '#38bdf8',
                background: mapLayer === 'ee_rgb' ? 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)' : 'rgba(15, 23, 42, 0.8)',
                color: '#ffffff',
                fontWeight: '800'
              }}
            >
              🛰️ Multispectral RGB Map ({selectedDate || 'Latest'})
            </button>
          )}

          {eeMapTiles?.nir_false_color && (
            <button
              className={`layer-chip ${mapLayer === 'ee_nir' ? 'active' : ''}`}
              onClick={() => setMapLayer('ee_nir')}
              style={{
                borderColor: '#a78bfa',
                background: mapLayer === 'ee_nir' ? 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)' : 'rgba(15, 23, 42, 0.8)',
                color: '#ffffff',
                fontWeight: '800'
              }}
            >
              🟣 False Color NIR (Infrared Spectrum)
            </button>
          )}

          {eeMapTiles?.red_green_health && (
            <button
              className={`layer-chip ${mapLayer === 'ee_red_green' ? 'active' : ''}`}
              onClick={() => setMapLayer('ee_red_green')}
              style={{
                borderColor: '#ef4444',
                background: mapLayer === 'ee_red_green' ? 'linear-gradient(135deg, #dc2626 0%, #16a34a 100%)' : 'rgba(15, 23, 42, 0.8)',
                color: '#ffffff',
                fontWeight: '700'
              }}
            >
              🔴/🟢 Crop Damage & Health Heatmap
            </button>
          )}

          <button
            className={`layer-chip ${mapLayer === 'google_hybrid' ? 'active' : ''}`}
            onClick={() => setMapLayer('google_hybrid')}
          >
            🌍 Base Satellite
          </button>

          <button
            className={`layer-chip ${mapLayer === 'osm' ? 'active' : ''}`}
            onClick={() => setMapLayer('osm')}
          >
            🗺️ Street Map
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="map-wrapper" style={{ cursor: isDrawing ? 'crosshair' : 'grab' }}>
        <MapContainer
          center={validCenter}
          zoom={zoom || 16}
          maxZoom={21}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%', borderRadius: '0 0 16px 16px' }}
        >
          <MapViewController center={validCenter} zoom={zoom || 16} />
          <MapEventsHandler
            isDrawing={isDrawing}
            onAddPoint={handleAddPoint}
            onMouseMove={handleMouseMove}
          />

          {/* BASE TILE LAYER */}
          {mapLayer === 'osm' ? (
            <TileLayer
              attribution='&copy; Street Basemap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          ) : (
            <TileLayer
              attribution='&copy; Satellite Imagery'
              url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
              maxZoom={21}
            />
          )}

          {/* OVERLAY 1: Sentinel-2 True Color RGB Map */}
          {mapLayer === 'ee_rgb' && eeMapTiles?.rgb && (
            <TileLayer
              url={eeMapTiles.rgb}
              maxZoom={21}
              opacity={1.0}
              attribution='&copy; Multispectral True Color Observation'
            />
          )}

          {/* OVERLAY 2: False Color NIR Spectrum */}
          {mapLayer === 'ee_nir' && eeMapTiles?.nir_false_color && (
            <TileLayer
              url={eeMapTiles.nir_false_color}
              maxZoom={21}
              opacity={0.92}
              attribution='&copy; Multispectral Infrared Spectrum'
            />
          )}

          {/* OVERLAY 3: Red vs Green Crop Damage Heatmap */}
          {(mapLayer === 'ee_red_green' || mapLayer === 'ee_ndvi') && eeMapTiles?.red_green_health && (
            <TileLayer
              url={eeMapTiles.red_green_health}
              maxZoom={21}
              opacity={0.88}
              attribution='&copy; Calibrated Crop Health Heatmap'
            />
          )}

          {/* =========================================================================
              ACTIVE DRAWING MODE: STREAM ANIMATIONS & RUBBER-BAND CURSOR TRACK
              ========================================================================= */}
          {isDrawing && points.length > 0 && (
            <>
              {/* 1. Translucent Polygon Fill (non-interactive so it never intercepts clicks!) */}
              {points.length >= 3 && (
                <Polygon
                  positions={points}
                  pathOptions={{
                    color: 'transparent',
                    fillColor: '#34d399',
                    fillOpacity: 0.25,
                  }}
                  interactive={false}
                />
              )}

              {/* 2. Placed Points: Live Animated Stream Polyline */}
              <Polyline
                positions={points}
                pathOptions={{
                  color: '#10b981',
                  weight: 4,
                  opacity: 1,
                  className: 'live-track-boundary',
                }}
                interactive={false}
              />

              {/* 3. Live Rubber-Band Laser Track from Last Placed Point to Mouse Cursor */}
              {liveMousePos && (
                <Polyline
                  positions={[points[points.length - 1], liveMousePos]}
                  pathOptions={{
                    color: '#38bdf8',
                    weight: 3,
                    opacity: 0.95,
                    className: 'live-track-cursor',
                  }}
                  interactive={false}
                />
              )}

              {/* 4. Guide Track connecting Mouse Cursor back to Point 1 to show polygon closure */}
              {points.length >= 2 && liveMousePos && (
                <Polyline
                  positions={[liveMousePos, points[0]]}
                  pathOptions={{
                    color: 'rgba(52, 211, 153, 0.45)',
                    weight: 2,
                    className: 'live-track-closing',
                  }}
                  interactive={false}
                />
              )}

              {/* 5. Placed Vertex Markers */}
              {points.map((pt, idx) => {
                const isFirst = idx === 0;
                const canClose = isFirst && points.length >= 3;
                return (
                  <Marker
                    key={`point-${idx}`}
                    position={pt}
                    icon={isFirst ? createFirstVertexIcon(canClose) : createIntermediateVertexIcon(idx, idx === points.length - 1)}
                    interactive={canClose}
                    eventHandlers={canClose ? { click: handleFinishPolygon } : {}}
                  >
                    {canClose && (
                      <Popup>
                        <div style={{ textAlign: 'center', padding: '0.2rem' }}>
                          <strong style={{ color: '#10b981' }}>🎯 Point 1 (Start)</strong>
                          <br />
                          Click to complete and close your farm boundary!
                        </div>
                      </Popup>
                    )}
                  </Marker>
                );
              })}

              {/* 6. Live Reticle Following Mouse Cursor */}
              {liveMousePos && (
                <Marker
                  position={liveMousePos}
                  icon={createCursorReticleIcon(points.length + 1)}
                  interactive={false}
                />
              )}
            </>
          )}

          {/* =========================================================================
              FINISHED / LOADED FARM BOUNDARY DISPLAY
              ========================================================================= */}
          {!isDrawing && completedPolygon && completedPolygon.length >= 3 && (
            <>
              <Polygon
                positions={completedPolygon}
                pathOptions={{
                  color: '#10b981',
                  fillColor: '#34d399',
                  fillOpacity: 0.4,
                  weight: 3.5,
                }}
              />
              {completedPolygon.map((pt, idx) => (
                <Marker
                  key={`done-${idx}`}
                  position={pt}
                  icon={createIntermediateVertexIcon(idx, idx === completedPolygon.length - 1)}
                />
              ))}
            </>
          )}

          {/* Location Center Marker */}
          {markerPosition && Array.isArray(markerPosition) && markerPosition.length === 2 && !isDrawing && points.length === 0 && (
            <Marker position={markerPosition}>
              <Popup>
                <div style={{ padding: '0.2rem', textAlign: 'center' }}>
                  <strong style={{ color: '#059669', fontSize: '0.95rem' }}>📍 Selected Location Center</strong>
                  <br />
                  Latitude: {markerPosition[0].toFixed(5)}° N
                  <br />
                  Longitude: {markerPosition[1].toFixed(5)}° E
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
