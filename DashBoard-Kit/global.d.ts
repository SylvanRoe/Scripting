// DashBoard-Kit 全局类型补充声明
declare global {
  function prompt(message: string): Promise<string | null>
  function prompt(options: {
    title: string
    message?: string
    defaultValue?: string
    obscureText?: boolean
    selectAll?: boolean
    placeholder?: string
    cancelLabel?: string
    confirmLabel?: string
    keyboardType?: unknown
  }): Promise<string | null>
  function alert(message: string): Promise<void>
  function confirm(message: string): Promise<boolean>
}

export {}
