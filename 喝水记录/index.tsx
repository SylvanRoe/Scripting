import { Navigation, Script } from "scripting"
import WaterView from "./WaterView"

async function run() {
  try { await Navigation.present(<WaterView />) }
  catch (error) { await (globalThis as any).alert({ title: "喝水记录无法打开", message: String(error) }) }
  finally { Script.exit() }
}
run()
