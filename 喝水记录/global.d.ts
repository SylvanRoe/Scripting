declare global {
  function alert(message: string): Promise<void>
  function alert(options: { title?: string; message: string; buttonLabel?: string }): Promise<void>
  function confirm(message: string): Promise<boolean>
  function confirm(options: { title?: string; message: string; confirmLabel?: string; cancelLabel?: string }): Promise<boolean>
}

export {}
