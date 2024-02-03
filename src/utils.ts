export function parseStringWithDate(str: string) {
  return JSON.parse(str, (_k, v) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/
    return dateRegex.test(v) ? new Date(v) : v
  })
}
