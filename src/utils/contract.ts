import { CONTRACT } from "ulujs";

export class uluClient {
  algodClient: any;
  indexerClient: any;
  address: string;
  constructor(algodClient: any, indexerClient: any, address: string) {
    this.algodClient = algodClient;
    this.indexerClient = indexerClient;
    this.address = address;
  }
  makeCI(ctcInfo: number, spec: any) {
    return makeCI(
      this.algodClient,
      this.indexerClient,
      this.address,
      ctcInfo,
      spec
    );
  }
  makeConstructor(ctcInfo: number, spec: any) {
    return makeConstructor(
      this.algodClient,
      this.indexerClient,
      this.address,
      ctcInfo,
      spec
    );
  }
}

const makeCI = (
  algodClient: any,
  indexerClient: any,
  addr: string,
  ctcInfo: number,
  spec: any
) =>
  new CONTRACT(ctcInfo, algodClient, indexerClient, spec, {
    addr,
    sk: new Uint8Array(0),
  });

const makeConstructor = (
  algodClient: any,
  indexerClient: any,
  addr: string,
  ctcInfo: number,
  spec: any
) =>
  new CONTRACT(
    ctcInfo,
    algodClient,
    indexerClient,
    spec,
    {
      addr,
      sk: new Uint8Array(0),
    },
    true,
    false,
    true
  );
