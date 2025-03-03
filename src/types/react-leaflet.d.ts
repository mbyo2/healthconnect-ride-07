
import { 
  Circle as LeafletCircle, 
  CircleMarker as LeafletCircleMarker,
  Map as LeafletMap, 
  Marker as LeafletMarker, 
  TileLayer as LeafletTileLayer,
  Popup as LeafletPopup,
  Path as LeafletPath,
  PathOptions
} from 'leaflet';
import { ReactNode, RefAttributes } from 'react';

// Extend the existing definitions from react-leaflet
declare module 'react-leaflet' {
  export interface MapContainerProps extends RefAttributes<LeafletMap> {
    center: [number, number];
    zoom: number;
    className?: string;
    minZoom?: number;
    maxZoom?: number;
    zoomControl?: boolean;
    scrollWheelZoom?: boolean;
    whenReady?: (map: { target: LeafletMap }) => void;
    children?: ReactNode;
    [key: string]: any;
  }

  export interface TileLayerProps extends RefAttributes<LeafletTileLayer> {
    url: string;
    attribution?: string;
    children?: ReactNode;
    [key: string]: any;
  }

  export interface MarkerProps extends RefAttributes<LeafletMarker<any>> {
    position: [number, number];
    icon?: any;
    children?: ReactNode;
    [key: string]: any;
  }

  export interface CircleProps extends RefAttributes<LeafletCircle<any>> {
    center: [number, number];
    radius: number;
    pathOptions?: PathOptions;
    children?: ReactNode;
    [key: string]: any;
  }

  export interface PopupProps extends RefAttributes<LeafletPopup> {
    children?: ReactNode;
    [key: string]: any;
  }

  export interface CircleMarkerProps extends RefAttributes<LeafletCircleMarker<any>> {
    center: [number, number];
    pathOptions?: PathOptions;
    radius?: number;
    children?: ReactNode;
    [key: string]: any;
  }

  export const MapContainer: React.FC<MapContainerProps>;
  export const TileLayer: React.FC<TileLayerProps>;
  export const Marker: React.FC<MarkerProps>;
  export const Popup: React.FC<PopupProps>;
  export const Circle: React.FC<CircleProps>;
  export const CircleMarker: React.FC<CircleMarkerProps>;
  export const useMap: () => LeafletMap;
}
