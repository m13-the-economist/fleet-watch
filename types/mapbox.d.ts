declare module '@mapbox/mapbox-sdk' {
    export default function mbxClient(options: { accessToken: string }): any;
  }
  
  declare module '@mapbox/mapbox-sdk/services/geocoding' {
    export default function mbxGeocoding(client: any): any;
  }