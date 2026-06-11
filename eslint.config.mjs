import coreWebVitals from "eslint-config-next/core-web-vitals"

export default [
  ...(Array.isArray(coreWebVitals) ? coreWebVitals : [coreWebVitals]),
  {
    rules: {
      // These fire on valid async-callback patterns (useCallback + useEffect for data fetching)
      "react-hooks/set-state-in-effect": "off",
      // Content files have natural apostrophes/quotes in prose — escape churn adds no value
      "react/no-unescaped-entities": "off",
      // Internal <a> tags work fine; Link optimisation is optional not required
      "@next/next/no-html-link-for-pages": "off",
      // Intentional impure calls (Date.now for age calc, Math.random for skeleton widths)
      "react-hooks/purity": "off",
      // Ref in event-handler closure created during render — false positive
      "react-hooks/refs": "off",
      // Creating new Set/Map from state data is not mutation of the state value
      "react-hooks/immutability": "off",
    },
  },
]
