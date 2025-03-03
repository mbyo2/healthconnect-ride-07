
declare module "react-leaflet" {
  import { ReactNode } from "react";
  import {
    Map as LeafletMap,
    MapOptions,
    LatLngExpression,
    LatLngBoundsExpression,
    PathOptions,
    CircleMarkerOptions,
    PolylineOptions,
    TileLayer as LeafletTileLayer,
    Marker as LeafletMarker,
    Circle as LeafletCircle,
    LayerGroup as LeafletLayerGroup,
    LatLng,
  } from "leaflet";

  export interface MapContainerProps extends MapOptions {
    center: LatLngExpression;
    zoom: number;
    className?: string;
    id?: string;
    style?: React.CSSProperties;
    zoomControl?: boolean;
    scrollWheelZoom?: boolean;
    whenReady?: (map: { target: LeafletMap }) => void;
    whenCreated?: (map: LeafletMap) => void;
    children?: ReactNode;
    [key: string]: any;
  }

  export interface TileLayerProps {
    url: string;
    attribution?: string;
    zIndex?: number;
    opacity?: number;
    tileSize?: number;
    [key: string]: any;
  }

  export interface MarkerProps {
    position: LatLngExpression;
    icon?: any;
    draggable?: boolean;
    eventHandlers?: any;
    zIndexOffset?: number;
    opacity?: number;
    [key: string]: any;
  }

  export interface CircleProps extends PathOptions {
    center: LatLngExpression;
    radius: number;
    pathOptions?: PathOptions;
    [key: string]: any;
  }

  export interface PopupProps {
    position?: LatLngExpression;
    offset?: [number, number];
    [key: string]: any;
  }

  export interface UseMapResult extends LeafletMap {
    setView(center: LatLngExpression, zoom?: number, options?: { animate?: boolean } | boolean): this;
  }

  export function MapContainer(props: MapContainerProps): JSX.Element;
  export function TileLayer(props: TileLayerProps): JSX.Element;
  export function Marker(props: MarkerProps): JSX.Element;
  export function Popup(props: PopupProps): JSX.Element;
  export function Circle(props: CircleProps): JSX.Element;
  export function LayerGroup(props: any): JSX.Element;
  export function useMap(): UseMapResult;
}
