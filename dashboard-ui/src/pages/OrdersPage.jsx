import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileSpreadsheet, CheckCircle2, Clock, AlertCircle, Search, Trash2, Download, X } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const orderStatuses = {
  completed: { icon: CheckCircle2, label: '已完成', color: 'success' },
  in_progress: { icon: Clock, label: '进行中', color: 'info' },
  pending: { icon: AlertCircle, label: '待审核', color: 'warning' },
}

// 模拟解析后的订单数据（实际项目中从 CSV/Excel 解析）
function parseUploadedFile(fileName) {
  // 模拟解析延迟
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        fileName,
        orders: [
          { id: 'ORD-20260617-001', service: '深度清洁', district: '青秀区', community: '翡翠园', level: '金牌', price: 268, margin: 42.3, status: 'pending', date: '2026-06-17', customer: '张女士' },
          { id: 'ORD-20260617-002', service: '日常保洁', district: '良庆区', community: '五象新区', level: '熟练', price: 155, margin: 35.8, status: 'pending', date: '2026-06-17', customer: '李先生' },
          { id: 'ORD-20260617-003', service: '开荒保洁', district: '江南区', community: '普罗旺斯', level: '金牌', price: 420, margin: 40.1, status: 'pending', date: '2026-06-17', customer: '王女士' },
        ],
      })
    }, 1500)
  })
}

export function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileUpload = async (file) => {
    if (!file) return
    const validTypes = ['.csv', '.xlsx', '.xls']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!validTypes.includes(ext)) {
      alert('请上传 CSV 或 Excel 文件（.csv, .xlsx, .xls）')
      return
    }

    setIsUploading(true)
    setUploadResult(null)

    try {
      const result = await parseUploadedFile(file.name)
      setOrders((prev) => [...prev, ...result.orders])
      setUploadResult({ success: true, count: result.orders.length, fileName: result.fileName })
    } catch {
      setUploadResult({ success: false, fileName: file.name })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFileUpload(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleInputChange = (e) => {
    const file = e.target.files[0]
    handleFileUpload(file)
    e.target.value = ''
  }

  const clearOrders = () => {
    setOrders([])
    setSelectedOrder(null)
    setUploadResult(null)
  }

  const filtered = orders.filter((o) =>
    (statusFilter === 'all' || o.status === statusFilter) &&
    (search === '' || o.id.includes(search) || o.customer.includes(search) || o.service.includes(search))
  )

  const pendingCount = orders.filter((o) => o.status === 'pending').length

  const hasOrders = orders.length > 0

  return (
    <>
      {/* Empty State */}
      <AnimatePresence mode="wait">
        {!hasOrders && !isUploading && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ background: 'rgba(0, 184, 169, 0.1)', border: '1px solid rgba(0, 184, 169, 0.2)' }}
                >
                  <Upload className="h-7 w-7" style={{ color: '#00b8a9' }} />
                </motion.div>
                <h3 className="mb-1 text-[16px] font-semibold text-text-primary">暂无订单数据</h3>
                <p className="mb-6 max-w-sm text-center text-[13px] text-text-muted">
                  请上传订单文件（CSV 或 Excel 格式）以导入订单数据。导入后可进行审核、筛选和管理操作。
                </p>

                {/* Upload Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative w-full max-w-md cursor-pointer rounded-[var(--radius-lg)] border-2 border-dashed p-8 text-center transition-all ${
                    isDragging
                      ? 'border-accent bg-accent-muted/20'
                      : 'border-border-default hover:border-border-strong hover:bg-bg-hover/30'
                  }`}
                >
                  <FileSpreadsheet className="mx-auto mb-3 h-8 w-8 text-text-muted" />
                  <p className="text-[13px] font-medium text-text-secondary">
                    拖拽文件到此处，或点击选择文件
                  </p>
                  <p className="mt-1 text-[11px] text-text-subtle">
                    支持 .csv, .xlsx, .xls 格式
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleInputChange}
                    className="hidden"
                  />
                </div>

                {/* Format Instructions */}
                <div className="mt-6 w-full max-w-md rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/30 p-4">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-subtle">
                    文件格式说明
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                    <span className="text-text-muted">订单编号</span>
                    <span className="font-mono text-text-subtle">ORD-20260617-001</span>
                    <span className="text-text-muted">服务类型</span>
                    <span className="font-mono text-text-subtle">深度清洁 / 日常保洁 / ...</span>
                    <span className="text-text-muted">客户姓名</span>
                    <span className="font-mono text-text-subtle">张女士</span>
                    <span className="text-text-muted">所属区域</span>
                    <span className="font-mono text-text-subtle">青秀区</span>
                    <span className="text-text-muted">服务价格</span>
                    <span className="font-mono text-text-subtle">268</span>
                    <span className="text-text-muted">订单日期</span>
                    <span className="font-mono text-text-subtle">2026-06-17</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Uploading State */}
        {isUploading && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-16"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className="mb-4 h-10 w-10 rounded-full border-2 border-border-default"
              style={{ borderTopColor: '#00b8a9' }}
            />
            <p className="text-[14px] font-medium text-text-primary">正在解析文件...</p>
            <p className="mt-1 text-[12px] text-text-muted">请稍候，系统正在处理上传的订单数据</p>
          </motion.div>
        )}

        {/* Orders List State */}
        {hasOrders && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            {/* Upload Success Banner */}
            {uploadResult?.success && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between rounded-[var(--radius-md)] border px-4 py-2.5"
                style={{
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                  background: 'rgba(16, 185, 129, 0.08)',
                }}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" style={{ color: '#10b981' }} />
                  <span className="text-[12px] text-text-secondary">
                    成功导入 <span className="font-semibold text-text-primary">{uploadResult.count}</span> 条订单
                    <span className="ml-1 text-text-subtle">({uploadResult.fileName})</span>
                  </span>
                </div>
                <button
                  onClick={() => setUploadResult(null)}
                  className="text-text-subtle transition-colors hover:text-text-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            )}

            {/* Status Summary */}
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(orderStatuses).map(([key, cfg]) => {
                const count = orders.filter((o) => o.status === key).length
                return (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                    className={`card rounded-[var(--radius-lg)] border p-4 text-left transition-all ${
                      statusFilter === key ? 'border-accent bg-accent-muted/30' : 'border-border-default hover:border-border-strong'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <cfg.icon
                        className="h-4 w-4"
                        style={{ color: cfg.color === 'success' ? '#10b981' : cfg.color === 'info' ? '#38bdf8' : '#f59e0b' }}
                      />
                      <span className="text-[12px] text-text-muted">{cfg.label}</span>
                    </div>
                    <div className="mt-1 text-[22px] font-semibold text-text-primary">{count}</div>
                  </button>
                )
              })}
            </div>

            {/* Order List */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>
                  订单列表{' '}
                  {pendingCount > 0 && (
                    <span className="ml-2 text-accent-hover">({pendingCount} 待审核)</span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-subtle" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="搜索订单号/客户/服务..."
                      className="h-7 w-56 rounded-[var(--radius-sm)] border border-border-default bg-bg-elevated/50 pl-8 pr-3 text-[12px] text-text-primary outline-none placeholder:text-text-subtle focus:border-accent"
                    />
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-7 items-center gap-1.5 rounded-[var(--radius-sm)] border border-border-default px-3 text-[12px] text-text-muted transition-colors hover:border-border-strong hover:text-text-secondary"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    追加导入
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleInputChange}
                    className="hidden"
                  />
                  <button
                    onClick={clearOrders}
                    className="flex h-7 items-center gap-1.5 rounded-[var(--radius-sm)] border border-border-default px-3 text-[12px] text-text-muted transition-colors hover:border-danger/30 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    清空
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border-subtle">
                  {filtered.map((order, i) => {
                    const status = orderStatuses[order.status]
                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.25 }}
                        onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                        className="flex cursor-pointer items-center gap-4 px-5 py-3 transition-colors hover:bg-bg-hover/50"
                      >
                        <status.icon
                          className="h-4 w-4 flex-shrink-0"
                          style={{ color: status.color === 'success' ? '#10b981' : status.color === 'info' ? '#38bdf8' : '#f59e0b' }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-mono text-text-muted">{order.id}</span>
                            <Badge variant={status.color}>{status.label}</Badge>
                          </div>
                          <div className="mt-0.5 text-[13px] font-medium text-text-primary">
                            {order.service} · {order.district} · {order.community}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-[15px] font-semibold text-text-primary">¥{order.price}</div>
                          <div className="text-[10px] text-text-muted">利润率 {order.margin}%</div>
                        </div>
                        <span className="w-[60px] flex-shrink-0 text-right text-[10px] text-text-subtle">
                          {order.date.slice(5)}
                        </span>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Order Detail Drawer */}
                {selectedOrder && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="border-t border-border-default bg-bg-elevated/30 px-5 py-4"
                  >
                    <div className="grid grid-cols-2 gap-4 text-[12px] md:grid-cols-4">
                      <div>
                        <span className="text-text-subtle">客户:</span>{' '}
                        <span className="ml-1 text-text-primary">{selectedOrder.customer}</span>
                      </div>
                      <div>
                        <span className="text-text-subtle">技能等级:</span>{' '}
                        <span className="ml-1 text-text-primary">{selectedOrder.level}</span>
                      </div>
                      <div>
                        <span className="text-text-subtle">区域:</span>{' '}
                        <span className="ml-1 text-text-primary">
                          {selectedOrder.district} {selectedOrder.community}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-subtle">日期:</span>{' '}
                        <span className="ml-1 text-text-primary">{selectedOrder.date}</span>
                      </div>
                    </div>
                    {selectedOrder.status === 'pending' && (
                      <div className="mt-3 flex gap-2">
                        <button className="rounded-[var(--radius-sm)] bg-success px-4 py-1.5 text-[12px] font-medium text-white hover:bg-success/90">
                          通过审核
                        </button>
                        <button className="rounded-[var(--radius-sm)] border border-border-default px-4 py-1.5 text-[12px] text-text-muted hover:bg-bg-hover">
                          退回修改
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Empty filtered result */}
                {filtered.length === 0 && hasOrders && (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Search className="mb-2 h-6 w-6 text-text-subtle" />
                    <p className="text-[13px] text-text-muted">没有匹配的订单</p>
                    <p className="mt-0.5 text-[11px] text-text-subtle">请尝试修改搜索条件或筛选状态</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
