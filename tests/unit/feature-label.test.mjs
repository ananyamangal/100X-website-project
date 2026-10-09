// Run: node --import ./tests/support/register.mjs --test tests/unit/feature-label.test.mjs
// Product list card bullets must keep the feature value (A9).
import test from "node:test"
import assert from "node:assert/strict"
import { featureLabel } from "../../lib/featureLabel.ts"

test("title + value renders as 'title: value'", () => {
  assert.equal(featureLabel({ title: "Tank Material", value: " Stainless Steel" }), "Tank Material: Stainless Steel")
  assert.equal(featureLabel({ title: "Starting ", value: "Easy Manual-Start" }), "Starting: Easy Manual-Start")
  assert.equal(featureLabel({ title: "Capacity:", value: "7 litre " }), "Capacity: 7 litre")
})

test("title only or value only renders the non-empty part", () => {
  assert.equal(featureLabel({ title: "Auto start button", value: "" }), "Auto start button")
  assert.equal(featureLabel({ title: "", value: "DC 12V" }), "DC 12V")
  assert.equal(featureLabel({ label: "Engine", value: "2HP" }), "Engine: 2HP")
  assert.equal(featureLabel({ name: "Heavy duty" }), "Heavy duty")
})

test("plain strings are kept whole, NBSP normalised", () => {
  assert.equal(featureLabel("Engine Power: 2HP"), "Engine Power: 2HP")
  assert.equal(featureLabel("Auto start"), "Auto start")
})

test("empty / unknown shapes give an empty string", () => {
  assert.equal(featureLabel(null), "")
  assert.equal(featureLabel(undefined), "")
  assert.equal(featureLabel({}), "")
  assert.equal(featureLabel({ title: { x: 1 } }), "")
})
