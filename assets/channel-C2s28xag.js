import { al as Utils, am as Color } from "./index-BFtmwBVq.js";
const channel = (color, channel2) => {
  return Utils.lang.round(Color.parse(color)[channel2]);
};
export {
  channel as c
};
