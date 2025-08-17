import React, { useEffect, useState } from "react"

const saveBaseUrl = (baseUrl: string) => {
  chrome.storage.local.set({ baseUrl }, () => {
    console.log("已保存 baseUrl:", baseUrl)
  })
}

const getBaseUrl = async () => {
  const { baseUrl } = await chrome.storage.local.get("baseUrl")
  return baseUrl || ""
}

function IndexPopup() {
  const [baseUrl, setBaseUrl] = useState("")

  useEffect(() => {
    getBaseUrl().then((url) => {
      if (!url) return
      setBaseUrl(url)
    })
  }, [])

  const handleClick = () => {
    if (!baseUrl) return
    saveBaseUrl(baseUrl)
  }

  return (
    <div className="p-2">
      <input
        type="text"
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        placeholder="输入 API Base URL"
        className="border p-1 rounded w-full"
      />
      <button
        onClick={handleClick}
        className="mt-2 bg-blue-500 text-white px-3 py-1 rounded">
        保存
      </button>
    </div>
  )
}

export default IndexPopup
