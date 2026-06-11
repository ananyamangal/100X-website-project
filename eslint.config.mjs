import coreWebVitals from "eslint-config-next/core-web-vitals"

export default [...(Array.isArray(coreWebVitals) ? coreWebVitals : [coreWebVitals])]
