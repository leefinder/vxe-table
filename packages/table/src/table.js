import XEUtils from 'xe-utils'
import TableHeader from './header'
import TableBody from './body'
import TableFooter from './footer'
import UtilTools from '../../../src/tools/utils'
import DomTools from '../../../src/tools/dom'
import ExportTools from '../../../src/tools/export'
import GlobalEvent from './event'
import GlobalConfig from '../../../src/conf'
import TableFilter from './filter'
import TableContextMenu from './menu'

/**
 * 渲染浮固定列
 */
function renderFixed (h, $table, fixedType, footerData) {
  let { tableData, tableColumn, collectColumn, isGroup, height, headerHeight, footerHeight, showHeader, showFooter, tableHeight, scrollYWidth, scrollXHeight, scrollRightToLeft, scrollLeftToRight, columnStore } = $table
  let customHeight = isNaN(height) ? 0 : parseFloat(height)
  let isRightFixed = fixedType === 'right'
  let style = {
    height: `${(customHeight ? customHeight - headerHeight - footerHeight : tableHeight) + headerHeight + footerHeight - scrollXHeight}px`,
    width: `${columnStore[`${fixedType}List`].reduce((previous, column) => previous + column.renderWidth, isRightFixed ? scrollYWidth + 1 : 0)}px`
  }
  return h('div', {
    class: [`vxe-table--fixed-${fixedType}-wrapper`, {
      'scrolling--middle': isRightFixed ? scrollRightToLeft : scrollLeftToRight
    }],
    style,
    ref: `fixedTable`
  }, [
    showHeader ? h('table-header', {
      props: {
        fixedType,
        tableData,
        tableColumn,
        collectColumn,
        isGroup
      },
      ref: `${fixedType}Header`
    }) : null,
    h('table-body', {
      style: {
        top: `${headerHeight}px`
      },
      props: {
        fixedType,
        tableData,
        tableColumn,
        collectColumn,
        isGroup
      },
      ref: `${fixedType}Body`
    }),
    showFooter ? h('table-footer', {
      style: {
        top: `${customHeight ? customHeight - footerHeight : tableHeight}px`
      },
      props: {
        fixedType,
        footerData,
        tableColumn
      },
      ref: `${fixedType}Footer`
    }) : null
  ])
}

export default {
  name: 'VxeTable',
  props: {
    /** 基本属性 */
    // 数据
    data: Array,
    // 初始化绑定动态列
    customs: Array,
    // 表格的高度
    height: [Number, String],
    // 表格的最大高度
    maxHeight: [Number, String],
    // 是否允许拖动列宽调整大小
    resizable: Boolean,
    // 是否带有斑马纹
    stripe: Boolean,
    // 是否带有纵向边框
    border: Boolean,
    // 表格的尺寸
    size: { type: String, default: () => GlobalConfig.size },
    // 列的宽度是否自撑开
    fit: { type: Boolean, default: true },
    // 表格是否加载中
    loading: Boolean,
    // 是否显示表头
    showHeader: { type: Boolean, default: true },
    // 是否要高亮当前选中行
    highlightCurrentRow: Boolean,
    // 鼠标移到行是否要高亮显示
    highlightHoverRow: Boolean,
    // 是否显示表尾合计
    showFooter: Boolean,
    // 表尾合计的计算方法
    footerMethod: Function,
    // 给行附加 className
    rowClassName: [String, Function],
    // 给单元格附加 className
    cellClassName: [String, Function],
    // 给表头的行附加 className
    headerRowClassName: [String, Function],
    // 给表头的单元格附加 className
    headerCellClassName: [String, Function],
    // 给表尾的行附加 className
    footerRowClassName: [String, Function],
    // 给表尾的单元格附加 className
    footerCellClassName: [String, Function],
    // 合并行或列
    spanMethod: Function,
    // 快捷菜单
    contextMenu: { type: Object, default: () => GlobalConfig.contextMenu },

    /** 高级属性 */
    // 行数据的 Key
    rowKey: [String, Number],
    // 列宽是否自动响应计算
    autoWidth: { type: Boolean, default: true },
    // 性能优化的配置项
    optimized: { type: [Object, Boolean], default: () => GlobalConfig.optimized }
  },
  components: {
    TableHeader,
    TableBody,
    TableFooter,
    TableFilter,
    TableContextMenu
  },
  provide () {
    return {
      $table: this
    }
  },
  data () {
    return {
      id: XEUtils.uniqueId(),
      // 完整列配置
      collectColumn: [],
      // 渲染的列
      tableColumn: [],
      // 渲染中的数据
      tableData: [],
      // 完整数据
      tableFullData: [],
      // 表格宽度
      tableWidth: 0,
      // 表格高度
      tableHeight: 0,
      // 表头高度
      headerHeight: 0,
      // 表尾高度
      footerHeight: 0,
      // 是否滚动方式加载
      scrollLoad: false,
      // 是否存在纵向滚动条
      overflowY: true,
      // 是否存在横向滚动条
      overflowX: false,
      // 纵向滚动条的宽度
      scrollYWidth: 0,
      // 横向滚动条的高度
      scrollXHeight: 0,
      // 左侧固定列是否向右滚动了
      scrollLeftToRight: false,
      // 右侧固定列是否向左滚动了
      scrollRightToLeft: false,
      // 是否全选
      isAllSelected: false,
      // 多选属性，有选中且非全选状态
      isIndeterminate: false,
      // 多选属性，已选中的列
      selection: [],
      // 单选属性
      selectRow: null,
      // 当前 hover 行
      hoverRow: null,
      // 当前选中的筛选列
      filterStore: {
        isAllSelected: false,
        isIndeterminate: false,
        style: null,
        options: [],
        column: null,
        multiple: false,
        visible: false
      },
      // 存放列相关的信息
      columnStore: {
        leftList: [],
        centerList: [],
        rightList: [],
        resizeList: [],
        pxList: [],
        pxMinList: [],
        scaleList: [],
        scaleMinList: [],
        autoList: []
      },
      // 存放快捷菜单的信息
      ctxMenuStore: {
        selected: null,
        visible: false,
        showChild: false,
        selectChild: null,
        list: [],
        style: {
          top: 0,
          left: 0
        }
      },
      // 存放滚动渲染相关的信息
      scrollStore: {
        renderSize: 0,
        visibleSize: 0,
        offsetSize: 0,
        rowHeight: 0,
        startIndex: 0,
        visibleIndex: 0,
        topSpaceHeight: 0,
        bottomSpaceHeight: 0
      }
    }
  },
  computed: {
    // 优化的参数
    optimizeConfig () {
      let isAll = this.optimized === true
      return Object.assign({
        // 显示效果开关
        animat: !isAll,
        // 如果设置了则不允许换行 ellipsis、title、tooltip
        overflow: isAll ? 'title' : null,
        // 默认大于 500 条时自动使用滚动渲染
        scroll: {
          gt: 500,
          oSize: 30,
          rSize: 120
        }
      }, this.optimized)
    },
    // 是否使用了分组表头
    isGroup () {
      return this.collectColumn.some(column => UtilTools.hasChildrenList(column))
    },
    visibleColumn () {
      return this.tableColumn.filter(column => column.visible)
    },
    isFilter () {
      return this.visibleColumn.some(column => column.filters && column.filters.length)
    },
    headerCtxMenu () {
      return this.ctxMenuConfig.header && this.ctxMenuConfig.header.options ? this.ctxMenuConfig.header.options : []
    },
    bodyCtxMenu () {
      return this.ctxMenuConfig.body && this.ctxMenuConfig.body.options ? this.ctxMenuConfig.body.options : []
    },
    isCtxMenu () {
      return this.headerCtxMenu.length || this.bodyCtxMenu.length
    },
    ctxMenuConfig () {
      return Object.assign({}, this.contextMenu)
    },
    ctxMenuList () {
      let rest = []
      this.ctxMenuStore.list.forEach(list => {
        list.forEach(item => {
          rest.push(item)
        })
      })
      return rest
    }
  },
  watch: {
    data (value) {
      this.reload(value)
    },
    customs (value) {
      if (!this.isUpdateCustoms) {
        this.mergeCustomColumn(value)
      }
      this.isUpdateCustoms = false
    },
    tableColumn () {
      this.analyColumnWidth()
    },
    visibleColumn () {
      this.$nextTick(() => this.computeWidth())
    }
  },
  created () {
    this.reload(this.data, true).then(() => {
      this.tableColumn = UtilTools.getColumnList(this.collectColumn)
      if (this.customs) {
        this.mergeCustomColumn(this.customs)
      }
      this.refreshColumn()
      this.$nextTick(() => {
        this.computeScrollLoad()
        this.computeWidth(true)
      })
    })
    GlobalEvent.on(this, 'click', this.handleGlobalClickEvent)
    GlobalEvent.on(this, 'blur', this.handleGlobalBlurEvent)
    GlobalEvent.on(this, 'contextmenu', this.handleContextmenuEvent)
    GlobalEvent.on(this, 'mousewheel', this.handleMousewheelEvent)
    GlobalEvent.on(this, 'keydown', this.handleKeydownEvent)
  },
  mounted () {
    document.body.appendChild(this.$refs.tableWrapper)
  },
  beforeDestroy () {
    let tableWrapper = this.$refs.tableWrapper
    if (tableWrapper && tableWrapper.parentNode) {
      tableWrapper.parentNode.removeChild(tableWrapper)
    }
    this.closeFilter()
    this.closeContextMenu()
  },
  destroyed () {
    GlobalEvent.off(this, 'click')
    GlobalEvent.off(this, 'blur')
    GlobalEvent.off(this, 'contextmenu')
    GlobalEvent.off(this, 'mousewheel')
    GlobalEvent.off(this, 'keydown')
  },
  render (h) {
    let { _e, id, tableData, tableColumn, collectColumn, isGroup, isFilter, isCtxMenu, loading, showHeader, resizable, border, stripe, highlightHoverRow, size, showFooter, footerMethod, overflowX, overflowY, scrollXHeight, optimizeConfig, columnStore, filterStore, ctxMenuStore } = this
    let { leftList, rightList } = columnStore
    let footerData = showFooter && footerMethod && tableColumn.length ? footerMethod({ columns: tableColumn, data: tableData }) : ['-']
    return h('div', {
      class: ['vxe-table', size ? `size--${size}` : '', {
        'show--head': showHeader,
        'show--foot': showFooter,
        'scroll--y': overflowY,
        'scroll--x': overflowX,
        't--animat': optimizeConfig.animat,
        't--stripe': stripe,
        't--border': border,
        't--highlight': highlightHoverRow
      }]
    }, [
      /**
       * 隐藏列
       */
      h('div', {
        class: ['vxe-table-hidden-column'],
        ref: 'hideColumn'
      }, this.$slots.default),
      /**
       * 主头部
       */
      showHeader ? h('table-header', {
        ref: 'tableHeader',
        props: {
          tableData,
          tableColumn,
          collectColumn,
          isGroup
        }
      }) : _e(),
      /**
       * 主内容
       */
      h('table-body', {
        ref: 'tableBody',
        props: {
          tableData,
          tableColumn,
          collectColumn,
          isGroup
        }
      }),
      /**
       * 底部汇总
       */
      showFooter ? h('table-footer', {
        props: {
          footerData,
          footerMethod,
          tableColumn
        },
        ref: 'tableFooter'
      }) : _e(),
      /**
       * 左侧固定列
       */
      leftList && leftList.length && overflowX ? renderFixed(h, this, 'left', footerData) : _e(),
      /**
       * 右侧固定列
       */
      rightList && rightList.length && overflowX ? renderFixed(h, this, 'right', footerData) : _e(),
      /**
       * 列宽线
       */
      resizable ? h('div', {
        class: ['vxe-table--resizable-bar'],
        style: overflowX ? {
          'padding-bottom': `${scrollXHeight}px`
        } : null,
        ref: 'resizeBar'
      }) : _e(),
      /**
       * 加载中
       */
      h('div', {
        class: ['vxe-table--loading'],
        style: {
          display: loading ? 'block' : 'none'
        }
      }, [
        h('div', {
          class: 'vxe-table--spinner'
        })
      ]),
      h('div', {
        class: [`vxe-table${id}-wrapper`],
        ref: 'tableWrapper'
      }, [
        /**
         * 筛选
         */
        isFilter ? h('table-filter', {
          props: {
            optimizeConfig,
            filterStore
          },
          ref: 'filterWrapper'
        }) : null,
        /**
         * 快捷菜单
         */
        isCtxMenu ? h('table-context-menu', {
          props: {
            ctxMenuStore
          },
          ref: 'ctxWrapper'
        }) : null
      ])
    ])
  },
  methods: {
    clearSelection () {
      this.isAllSelected = false
      this.isIndeterminate = false
      this.selection = []
    },
    clearSelectRow () {
      this.selectRow = null
      this.hoverRow = null
    },
    clearSort () {
      this.tableColumn.forEach(column => {
        column.order = null
      })
      this.tableFullData = this.data || []
      this.tableData = this.tableFullData
    },
    clearFilter (force) {
      Object.assign(this.filterStore, {
        isAllSelected: false,
        isIndeterminate: false,
        style: null,
        options: [],
        column: null,
        multiple: false,
        visible: false
      })
    },
    reload (data, init) {
      let { autoWidth, scrollStore, optimizeConfig, computeWidth, computeScrollLoad } = this
      let scroll = optimizeConfig.scroll
      let tableFullData = data || []
      let scrollLoad = scroll && scroll.gt && scroll.gt < tableFullData.length
      if (scrollLoad) {
        Object.assign(scrollStore, {
          startIndex: 0,
          visibleIndex: 0,
          renderSize: scroll.rSize,
          offsetSize: scroll.oSize
        })
      }
      this.tableFullData = tableFullData
      this.scrollLoad = scrollLoad
      this.tableData = this.getTableData()
      let rest = this.$nextTick()
      if (!init && autoWidth) {
        rest = rest.then(computeWidth)
      }
      if (!init && scrollLoad) {
        rest = rest.then(computeScrollLoad)
      }
      return rest
    },
    /**
     * 获取全量的表格数据
     * 如果存在筛选条件，继续处理
     * 如果存在排序，继续处理
     */
    getTableData () {
      let { tableColumn, tableFullData, scrollLoad, scrollStore } = this
      let { isAllSelected, isIndeterminate } = this.filterStore
      let column = this.tableColumn.find(column => column.order)
      let tableData = tableFullData
      if (isAllSelected || isIndeterminate) {
        tableData = tableData.filter(row => {
          return tableColumn.every(column => {
            let { property, filters, filterMethod } = column
            if (filters && filters.length) {
              let valueList = []
              filters.forEach(item => {
                if (item.checked) {
                  valueList.push(item.value)
                }
              })
              if (valueList.length) {
                let a = filterMethod ? valueList.some(value => filterMethod({ value, row, column })) : valueList.indexOf(XEUtils.get(row, property)) > -1
                return a
              }
            }
            return true
          })
        })
      }
      if (column && column.order) {
        let rest = XEUtils.sortBy(tableData, column.property)
        tableData = column.order === 'desc' ? rest.reverse() : rest
      }
      return scrollLoad ? tableData.slice(scrollStore.startIndex, scrollStore.startIndex + scrollStore.renderSize) : tableData
    },
    /**
     * 动态列处理
     */
    mergeCustomColumn (customColumns) {
      this.isUpdateCustoms = true
      this.tableColumn.map(column => {
        let item = customColumns.find(item => column.property && item.prop === column.property)
        column.visible = item ? !!item.visible : true
      })
      this.$emit('update:customs', this.tableColumn)
    },
    /**
     * 刷新列信息
     * 将固定的列左边、右边分别靠边
     * 如果使用了分组表头，固定列必须在左侧或者右侧
     */
    refreshColumn () {
      let isColspan
      let letIndex = 0
      let leftList = []
      let rightIndex = 0
      let centerList = []
      let rightList = []
      this.tableColumn.forEach((column, columnIndex) => {
        if (column.fixed === 'left') {
          if (!isColspan) {
            if (columnIndex - letIndex !== 0) {
              isColspan = true
            } else {
              letIndex++
            }
          }
          leftList.push(column)
        } else if (column.fixed === 'right') {
          if (!isColspan) {
            if (!rightIndex) {
              rightIndex = columnIndex
            }
            if (columnIndex - rightIndex !== 0) {
              isColspan = true
            } else {
              rightIndex++
            }
          }
          rightList.push(column)
        } else {
          centerList.push(column)
        }
      })
      this.tableColumn = leftList.concat(centerList).concat(rightList)
      Object.assign(this.columnStore, { leftList, centerList, rightList })
      if ((isColspan && this.isGroup) || (rightIndex && rightIndex !== this.tableColumn.length)) {
        throw new Error('[vxe-table] Fixed column must to the left and right sides.')
      }
    },
    /**
     * 指定列宽的列进行拆分
     */
    analyColumnWidth () {
      let resizeList = []
      let pxList = []
      let pxMinList = []
      let scaleList = []
      let scaleMinList = []
      let autoList = []
      this.tableColumn.forEach(column => {
        if (column.visible) {
          if (column.resizeWidth) {
            resizeList.push(column)
          } else if (DomTools.isPx(column.width)) {
            pxList.push(column)
          } else if (DomTools.isScale(column.width)) {
            scaleList.push(column)
          } else if (DomTools.isPx(column.minWidth)) {
            pxMinList.push(column)
          } else if (DomTools.isScale(column.minWidth)) {
            scaleMinList.push(column)
          } else {
            autoList.push(column)
          }
        }
      })
      Object.assign(this.columnStore, { resizeList, pxList, pxMinList, scaleList, scaleMinList, autoList })
    },
    /**
     * 计算单元格列宽，动态分配可用剩余空间
     * 支持 width=? width=?px width=?% min-width=? min-width=?px min-width=?%
     */
    computeWidth (refull) {
      let tableBody = this.$refs.tableBody
      let tableHeader = this.$refs.tableHeader
      let tableFooter = this.$refs.tableFooter
      let bodyElem = tableBody.$el
      let headerElem = tableHeader ? tableHeader.$el : null
      let footerElem = tableFooter ? tableFooter.$el : null
      let bodyWidth = bodyElem.clientWidth
      let tableWidth = this.autoCellWidth(headerElem, bodyElem, footerElem, bodyWidth)
      if (refull === true) {
        // 初始化时需要在列计算之后再执行优化运算，达到最优显示效果
        this.$nextTick(() => {
          bodyWidth = bodyElem.clientWidth
          if (bodyWidth !== tableWidth) {
            this.autoCellWidth(headerElem, bodyElem, footerElem, bodyWidth)
          }
        })
      }
    },
    // 列宽计算
    autoCellWidth (headerElem, bodyElem, footerElem, bodyWidth) {
      let meanWidth
      let tableWidth = 0
      let minCellWidth = 40 // 列宽最少限制 40px
      let remainWidth = bodyWidth
      let { fit, columnStore } = this
      let { resizeList, pxMinList, pxList, scaleList, scaleMinList, autoList } = columnStore
      // 最小宽
      pxMinList.forEach(column => {
        let minWidth = parseInt(column.minWidth)
        tableWidth += minWidth
        column.renderWidth = minWidth
      })
      // 最小百分比
      meanWidth = remainWidth / 100
      scaleMinList.forEach(column => {
        let scaleWidth = Math.floor(parseInt(column.minWidth) * meanWidth)
        tableWidth += scaleWidth
        column.renderWidth = scaleWidth
      })
      // 固定百分比
      scaleList.forEach(column => {
        let scaleWidth = Math.floor(parseInt(column.width) * meanWidth)
        tableWidth += scaleWidth
        column.renderWidth = scaleWidth
      })
      // 固定宽
      pxList.forEach(column => {
        let width = parseInt(column.width)
        tableWidth += width
        column.renderWidth = width
      })
      // 调整了列宽
      resizeList.forEach(column => {
        let width = parseInt(column.resizeWidth)
        tableWidth += width
        column.renderWidth = width
      })
      remainWidth -= tableWidth
      meanWidth = remainWidth > 0 ? Math.max(Math.floor(remainWidth / (scaleMinList.length + pxMinList.length + autoList.length)), minCellWidth) : minCellWidth
      if (fit) {
        if (remainWidth > 0) {
          scaleMinList.concat(pxMinList).forEach(column => {
            tableWidth += meanWidth
            column.renderWidth += meanWidth
          })
        }
      } else {
        meanWidth = minCellWidth
      }
      // 自适应
      autoList.forEach((column, index) => {
        column.renderWidth = meanWidth
        tableWidth += meanWidth
        if (fit && index === autoList.length - 1) {
          // 如果所有列足够放的情况下，修补列之间的误差
          let odiffer = bodyWidth - tableWidth
          if (odiffer > 0) {
            column.renderWidth += odiffer
            tableWidth = bodyWidth
          }
        }
      })
      let tableHeight = bodyElem.offsetHeight
      this.scrollYWidth = bodyElem.offsetWidth - bodyWidth
      this.overflowY = this.scrollYWidth > 0
      this.tableWidth = tableWidth
      this.tableHeight = tableHeight
      if (headerElem) {
        this.headerHeight = headerElem.offsetHeight
      }
      if (footerElem) {
        let footerHeight = footerElem.offsetHeight
        this.scrollXHeight = Math.max(footerHeight - footerElem.clientHeight - 1, 0)
        this.overflowX = tableWidth > footerElem.clientWidth
        this.footerHeight = footerHeight
      } else {
        this.scrollXHeight = Math.max(tableHeight - bodyElem.clientHeight - 1, 0)
        this.overflowX = tableWidth > bodyWidth
      }
      if (this.overflowX) {
        this.checkScrolling()
      }
      return tableWidth
    },
    /**
     * 处理固定列的显示状态
     */
    checkScrolling () {
      let { tableBody, leftBody, rightBody } = this.$refs
      let bodyElem = tableBody.$el
      if (leftBody) {
        this.scrollLeftToRight = bodyElem.scrollLeft > 0
      }
      if (rightBody) {
        this.scrollRightToLeft = bodyElem.clientWidth < bodyElem.scrollWidth - bodyElem.scrollLeft
      }
    },
    /**
     * 全局点击事件处理
     */
    handleGlobalClickEvent (evnt) {
      if (this.$refs.filterWrapper) {
        if (this.getEventTargetNode(evnt, this.$el, 'vxe-filter-wrapper').flag) {
          // 如果点击了筛选按钮
        } else if (this.getEventTargetNode(evnt, this.$refs.filterWrapper.$el).flag) {
          // 如果点击筛选容器
        } else {
          this.closeFilter()
        }
      }
      if (this.$refs.ctxWrapper && !this.getEventTargetNode(evnt, this.$refs.ctxWrapper.$el).flag) {
        this.closeContextMenu()
      }
    },
    /**
     * 窗口失焦事件处理
     */
    handleGlobalBlurEvent (evnt) {
      this.closeFilter()
      this.closeContextMenu()
    },
    /**
     * 全局滚动事件
     */
    handleMousewheelEvent (evnt) {
      this.closeContextMenu()
    },
    /**
     * 全局键盘事件
     */
    handleKeydownEvent (evnt) {
      let keyCode = evnt.keyCode
      let isEsc = keyCode === 27
      let isEnter = keyCode === 13
      let isSpacebar = keyCode === 32
      let isLeftArrow = keyCode === 37
      let isUpArrow = keyCode === 38
      let isRightArrow = keyCode === 39
      let isDwArrow = keyCode === 40
      if (isEsc) {
        // 如果按下 Esc 键，关闭快捷菜单、筛选
        this.closeContextMenu()
        this.closeFilter()
      } else if (this.isCtxMenu) {
        // 如果配置了右键菜单; 支持方向键操作、回车
        let { ctxMenuStore } = this
        if (ctxMenuStore.visible && (isEnter || isSpacebar || isLeftArrow || isUpArrow || isRightArrow || isDwArrow)) {
          evnt.preventDefault()
          evnt.stopPropagation()
          if (ctxMenuStore.showChild && UtilTools.hasChildrenList(ctxMenuStore.selected)) {
            this.moveCtxMenu(evnt, keyCode, ctxMenuStore, 'selectChild', 37, false, ctxMenuStore.selected.children)
          } else {
            this.moveCtxMenu(evnt, keyCode, ctxMenuStore, 'selected', 39, true, this.ctxMenuList)
          }
        }
      }
    },
    // 处理菜单的移动
    moveCtxMenu (evnt, keyCode, ctxMenuStore, key, operKey, operRest, menuList) {
      let selectIndex = XEUtils.findIndexOf(menuList, item => ctxMenuStore[key] === item)
      if (keyCode === operKey) {
        if (operRest && UtilTools.hasChildrenList(ctxMenuStore.selected)) {
          ctxMenuStore.showChild = true
        } else {
          ctxMenuStore.showChild = false
          ctxMenuStore.selectChild = null
        }
      } else if (keyCode === 38) {
        ctxMenuStore[key] = menuList[selectIndex - 1] || menuList[menuList.length - 1]
      } else if (keyCode === 40) {
        ctxMenuStore[key] = menuList[selectIndex + 1] || menuList[0]
      } else if (ctxMenuStore[key] && (keyCode === 13 || keyCode === 32)) {
        this.ctxMenuLinkEvent(evnt, ctxMenuStore[key])
      }
    },
    /**
     * 快捷菜单事件处理
     */
    handleContextmenuEvent (evnt) {
      let { isCtxMenu, ctxMenuConfig } = this
      if (isCtxMenu) {
        // 右键头部
        let headeWrapperNode = this.getEventTargetNode(evnt, this.$el, 'vxe-table--header-wrapper')
        if (headeWrapperNode.flag) {
          this.openContextMenu(evnt, ctxMenuConfig.header, { })
          return
        }
        // 右键内容
        let bodyWrapperNode = this.getEventTargetNode(evnt, this.$el, 'vxe-table--body-wrapper')
        if (bodyWrapperNode.flag) {
          this.openContextMenu(evnt, ctxMenuConfig.body, { })
          return
        }
      }
      this.closeContextMenu()
      this.closeFilter()
    },
    /**
     * 显示快捷菜单
     */
    openContextMenu (evnt, config, params) {
      if (config) {
        let { ctxMenuStore } = this
        let { options, visibleMethod, disabled } = config
        if (disabled) {
          evnt.preventDefault()
        } else if (options && options.length) {
          if (!visibleMethod || visibleMethod(params, evnt)) {
            evnt.preventDefault()
            let { scrollTop, scrollLeft, visibleHeight, visibleWidth } = DomTools.getDomNode()
            let top = evnt.clientY + scrollTop
            let left = evnt.clientX + scrollLeft
            Object.assign(ctxMenuStore, {
              visible: true,
              list: options,
              selected: null,
              selectChild: null,
              showChild: false,
              style: {
                top: `${top}px`,
                left: `${left}px`
              }
            })
            this.$nextTick(() => {
              let ctxElem = this.$refs.ctxWrapper.$el
              let clientHeight = ctxElem.clientHeight
              let clientWidth = ctxElem.clientWidth
              let offsetTop = evnt.clientY + clientHeight - visibleHeight
              let offsetLeft = evnt.clientX + clientWidth - visibleWidth
              if (offsetTop > -10) {
                ctxMenuStore.style.top = `${top - clientHeight}px`
              }
              if (offsetLeft > -10) {
                ctxMenuStore.style.left = `${left - clientWidth}px`
              }
            })
          } else {
            this.closeContextMenu()
          }
        }
      }
      this.closeFilter()
    },
    /**
     * 关闭快捷菜单
     */
    closeContextMenu () {
      Object.assign(this.ctxMenuStore, {
        list: [],
        visible: false,
        selected: null,
        selectChild: null,
        showChild: false
      })
    },
    ctxMenuMouseoverEvent (evnt, item, child) {
      let ctxMenuStore = this.ctxMenuStore
      evnt.preventDefault()
      evnt.stopPropagation()
      ctxMenuStore.selected = item
      ctxMenuStore.selectChild = child
      if (!child) {
        ctxMenuStore.showChild = UtilTools.hasChildrenList(item)
      }
    },
    ctxMenuMouseoutEvent (evnt, item, child) {
      let ctxMenuStore = this.ctxMenuStore
      if (!item.children) {
        ctxMenuStore.selected = null
      }
      ctxMenuStore.selectChild = null
    },
    /**
     * 快捷菜单点击事件
     */
    ctxMenuLinkEvent (evnt, menu) {
      UtilTools.emitEvent(this, 'context-menu-link', [menu, evnt])
      this.closeContextMenu()
    },
    /**
     * 检查触发源是否属于目标节点
     */
    getEventTargetNode (evnt, container, queryCls) {
      let targetElem
      let target = evnt.target
      while (target && target.nodeType && target !== document) {
        if (DomTools.hasClass(target, queryCls)) {
          targetElem = target
        } else if (target === container) {
          return { flag: queryCls ? !!targetElem : true, container, targetElem: targetElem }
        }
        target = target.parentNode
      }
      return { flag: false }
    },
    /**
     * 多选，行选中事件
     */
    triggerCheckRowEvent (evnt, value, { row, column }) {
      let { $listeners, selection, tableData } = this
      let { property } = column
      if (property) {
        XEUtils.set(row, property, value)
        this.isAllSelected = tableData.every(item => XEUtils.get(item, property))
        this.isIndeterminate = !this.isAllSelected && tableData.some(item => XEUtils.get(item, property))
        if ($listeners['select-change']) {
          selection = tableData.filter(item => XEUtils.get(item, property))
        }
      } else {
        if (value) {
          selection.push(row)
        } else {
          XEUtils.remove(selection, item => item === row)
        }
        this.isAllSelected = tableData.length === selection.length
        this.isIndeterminate = !this.isAllSelected && selection.length
      }
      UtilTools.emitEvent(this, 'select-change', [{ row, column, selection, checked: value }, evnt])
    },
    /**
     * 多选，切换某一行的选中状态
     */
    toggleRowSelection (row, checked) {
      let column = this.tableColumn.find(column => column.type === 'selection')
      this.triggerCheckRowEvent(null, checked, { row, column })
    },
    /**
     * 多选，选中所有事件
     */
    triggerCheckAllEvent (evnt, value) {
      let column = this.tableColumn.find(column => column.type === 'selection')
      let property = column.property
      if (property) {
        this.tableData.forEach(item => {
          XEUtils.set(item, property, value)
        })
      }
      this.selection = value ? Array.from(this.tableData) : []
      this.isAllSelected = value
      this.isIndeterminate = false
      UtilTools.emitEvent(this, 'select-all', [{ selection: this.selection, checked: value }, evnt])
    },
    /**
     * 多选，切换所有行的选中状态
     */
    toggleAllSelection () {
      this.triggerCheckAllEvent(null, !this.isAllSelected)
    },
    /**
     * 单选，行选中事件
     */
    triggerRowEvent (evnt, { row }) {
      this.selectRow = row
      UtilTools.emitEvent(this, 'select-change', [{ row }, evnt])
    },
    /**
     * 单选，设置某一行为选中状态，如果调不加参数，则会取消目前高亮行的选中状态
     */
    setCurrentRow (row) {
      this.selectRow = row
    },
    /**
     * 行 hover 事件
     */
    triggerHoverEvent (evnt, { row }) {
      this.hoverRow = row
    },
    /**
     * 列点击事件
     */
    triggerCellClickEvent (evnt, params) {
      if (this.highlightCurrentRow) {
        this.selectRow = params.row
      }
      UtilTools.emitEvent(this, 'cell-click', [params, evnt])
    },
    /**
     * 列双击点击事件
     */
    triggerCellDBLClickEvent (evnt, params) {
      UtilTools.emitEvent(this, 'cell-dblclick', [params, evnt])
    },
    /**
     * 点击排序事件
     */
    triggerSortEvent (evnt, column, params, order) {
      if (column.order !== order) {
        let prop = column.property
        this.tableColumn.forEach(column => {
          column.order = null
        })
        column.order = order
        // 如果是服务端排序，则跳过本地排序处理
        if (column.sortable !== 'custom') {
          this.tableData = this.getTableData()
        }
        UtilTools.emitEvent(this, 'sort-change', [{ column, prop, order }])
      }
    },
    /**
     * 点击筛选事件
     */
    triggerFilterEvent (evnt, column, params) {
      let filterStore = this.filterStore
      if (filterStore.column === column && filterStore.visible) {
        filterStore.visible = false
      } else {
        let { top, left } = DomTools.getOffsetPos(evnt.target)
        Object.assign(filterStore, {
          multiple: column.filterMultiple,
          options: column.filters,
          column: column,
          style: {
            top: `${top + evnt.target.clientHeight + 6}px`,
            left: `${left}px`
          },
          visible: true
        })
        filterStore.isAllSelected = filterStore.options.every(item => item.checked)
        filterStore.isIndeterminate = !this.isAllSelected && filterStore.options.some(item => item.checked)
        this.$nextTick(() => {
          filterStore.style = {
            top: `${top + evnt.target.clientHeight + 6}px`,
            left: `${left - this.$refs.filterWrapper.$el.clientWidth / 2 + 10}px`
          }
        })
      }
    },
    // 确认筛选
    confirmFilterEvent (evnt) {
      this.tableData = this.getTableData()
      this.closeFilter()
    },
    // 关闭筛选
    closeFilter (evnt) {
      Object.assign(this.filterStore, {
        isAllSelected: false,
        isIndeterminate: false,
        options: [],
        visible: false
      })
    },
    // 重置筛选
    resetFilterEvent (evnt) {
      this.filterStore.options.forEach(item => {
        item.checked = false
      })
      this.closeFilter()
    },
    /**
     * 是否启用了滚动渲染
     */
    isScrollLoad () {
      return this.scrollLoad
    },
    /**
     * 滚动渲染事件处理
     */
    triggerSrcollEvent: XEUtils.debounce(function (evnt) {
      let { tableFullData, scrollStore } = this
      let { startIndex, renderSize, offsetSize, visibleSize, rowHeight } = scrollStore
      let scrollBodyElem = evnt.target
      let scrollTop = scrollBodyElem.scrollTop
      let toVisibleIndex = Math.ceil(scrollTop / rowHeight)
      if (scrollStore.visibleIndex !== toVisibleIndex) {
        let isReload, preloadSize
        let isTop = scrollStore.visibleIndex > toVisibleIndex
        if (isTop) {
          preloadSize = renderSize - offsetSize
          isReload = toVisibleIndex - offsetSize <= startIndex
        } else {
          preloadSize = offsetSize
          isReload = toVisibleIndex + visibleSize + offsetSize >= startIndex + renderSize
        }
        if (isReload) {
          scrollStore.visibleIndex = toVisibleIndex
          scrollStore.startIndex = Math.min(Math.max(toVisibleIndex - preloadSize, 0), tableFullData.length - renderSize)
          this.updateScrollSpace()
          this.$nextTick(() => {
            scrollBodyElem.scrollTop = scrollTop
          })
        }
      }
    }, DomTools.browse.msie ? 100 : 40, { leading: false, trailing: true }),
    // 计算滚动渲染相关数据
    computeScrollLoad () {
      let { scrollStore } = this
      let tableBodyElem = this.$refs.tableBody.$el
      let tableHeader = this.$refs.tableHeader
      let firstTrElem = tableBodyElem.querySelector('tbody>tr')
      if (!firstTrElem && tableHeader) {
        firstTrElem = tableHeader.$el.querySelector('thead>tr')
      }
      if (firstTrElem) {
        scrollStore.rowHeight = firstTrElem.clientHeight
      }
      scrollStore.visibleSize = Math.ceil(tableBodyElem.clientHeight / scrollStore.rowHeight)
      this.updateScrollSpace()
    },
    // 更新滚动上下空间大小
    updateScrollSpace () {
      let { tableFullData, scrollStore } = this
      this.tableData = this.getTableData()
      scrollStore.topSpaceHeight = scrollStore.startIndex * scrollStore.rowHeight
      scrollStore.bottomSpaceHeight = (tableFullData.length - (scrollStore.startIndex + scrollStore.renderSize)) * scrollStore.rowHeight
    },
    /**
     * 导出 csv 文件
     */
    exportCsv (options) {
      let opts = Object.assign({
        filename: 'table.csv',
        original: false,
        isHeader: true,
        download: true,
        data: null,
        columns: null,
        columnFilterMethod: column => ['index', 'selection', 'radio'].indexOf(column.type) === -1 && column.property,
        dataFilterMethod: null
      }, options)
      if (opts.filename.indexOf('.csv') === -1) {
        opts.filename += '.csv'
      }
      if (this.scrollLoad) {
        opts.original = true
      }
      let columns = this.tableColumn
      let oData = this.getTableData()
      return ExportTools.downloadCsc(opts, ExportTools.getCsvContent(opts, oData, columns, this.$el))
    }
  }
}
