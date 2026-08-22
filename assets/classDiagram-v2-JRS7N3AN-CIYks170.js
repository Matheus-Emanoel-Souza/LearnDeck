import { s as styles_default, c as classRenderer_v3_unified_default, a as classDiagram_default, C as ClassDB } from "./chunk-LCL6LL3I-CpwJ_R_9.js";
import { _ as __name } from "./index-BFtmwBVq.js";
import "./chunk-5VM5RSS4-DDCzHdxj.js";
import "./chunk-XXDRQBXY-BQXGtiL1.js";
import "./chunk-POPQ4Y6H-BUBMVfnO.js";
import "./chunk-F27PBJKO-D-YWniKF.js";
var diagram = {
  parser: classDiagram_default,
  get db() {
    return new ClassDB();
  },
  renderer: classRenderer_v3_unified_default,
  styles: styles_default,
  init: /* @__PURE__ */ __name((cnf) => {
    if (!cnf.class) {
      cnf.class = {};
    }
    cnf.class.arrowMarkerAbsolute = cnf.arrowMarkerAbsolute;
  }, "init")
};
export {
  diagram
};
