import { c as createFlowDiagram, s as styles_default } from "./flowDiagram-A5DVABFB-CYKalmY2.js";
import { _ as __name } from "./index-BFtmwBVq.js";
import "./chunk-5VM5RSS4-DDCzHdxj.js";
import "./chunk-XXDRQBXY-BQXGtiL1.js";
import "./chunk-POPQ4Y6H-BUBMVfnO.js";
import "./chunk-F27PBJKO-D-YWniKF.js";
import "./channel-C2s28xag.js";
var getStyles = /* @__PURE__ */ __name((options) => `${styles_default(options)}
  .swimlane.cluster rect {
    stroke: ${options.clusterBorder} !important;
  }
  [data-look="neo"].cluster rect {
    filter: none;
  }
`, "getStyles");
var styles_default2 = getStyles;
var diagram = createFlowDiagram({ defaultLayout: "swimlane", styles: styles_default2 });
export {
  diagram
};
