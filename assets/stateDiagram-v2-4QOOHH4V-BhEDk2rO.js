import { s as styles_default, b as stateRenderer_v3_unified_default, a as stateDiagram_default, S as StateDB } from "./chunk-G27WJ6UU-D1QqP_aj.js";
import { _ as __name } from "./index-BFtmwBVq.js";
import "./chunk-XXDRQBXY-BQXGtiL1.js";
import "./chunk-POPQ4Y6H-BUBMVfnO.js";
import "./chunk-F27PBJKO-D-YWniKF.js";
var diagram = {
  parser: stateDiagram_default,
  get db() {
    return new StateDB(2);
  },
  renderer: stateRenderer_v3_unified_default,
  styles: styles_default,
  init: /* @__PURE__ */ __name((cnf) => {
    if (!cnf.state) {
      cnf.state = {};
    }
    cnf.state.arrowMarkerAbsolute = cnf.arrowMarkerAbsolute;
  }, "init")
};
export {
  diagram
};
