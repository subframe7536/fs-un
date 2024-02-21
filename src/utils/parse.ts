export function parseJsonStringWithDate(jsonString: string) {
  return JSON.parse(jsonString, (_, v) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/
    return dateRegex.test(v) ? new Date(v) : v
  })
}
