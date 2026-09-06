import { AppIntentManager, AppIntentProtocol } from "scripting"
import { addRecord, loadMl } from "./model"

// 保留旧名称，已添加到桌面的组件仍然可以调用。
// 后台只保存本地记录；健康写入由用户在前台主动执行。
function registerDrink(name: string, drinkId: string) {
  return AppIntentManager.register({
    name,
    protocol: AppIntentProtocol.AppIntent,
    perform: async (_: {}) => {
      addRecord(drinkId, loadMl())
    },
  })
}
export const RecordWaterIntent = registerDrink("RecordWater", "water")
export const RecordTeaIntent = registerDrink("RecordTea", "tea")
export const RecordCoffeeIntent = registerDrink("RecordCoffee", "coffee")
export const RecordJuiceIntent = registerDrink("RecordJuice", "juice")
export const RecordMilkIntent = registerDrink("RecordMilk", "milk")
export const RecordSodaIntent = registerDrink("RecordSoda", "soda")
export const RecordSportsIntent = registerDrink("RecordSports", "sports")
export const RecordSoupIntent = registerDrink("RecordSoup", "soup")

export function intentFor(id: string) {
  switch (id) {
    case "tea": return RecordTeaIntent({})
    case "coffee": return RecordCoffeeIntent({})
    case "juice": return RecordJuiceIntent({})
    case "milk": return RecordMilkIntent({})
    case "soda": return RecordSodaIntent({})
    case "sports": return RecordSportsIntent({})
    case "soup": return RecordSoupIntent({})
    default: return RecordWaterIntent({})
  }
}
