package com.fluxlist

import android.animation.LayoutTransition
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.PopupMenu
import android.widget.Space
import android.widget.ScrollView
import android.widget.TextView
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.uimanager.PixelUtil
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sign

data class FluxListAction(
  val key: String,
  val title: String,
  val color: Int?,
  val destructive: Boolean,
)

interface FluxListEventListener {
  fun onSearchChange(query: String)
  fun onVisibleRangeChange(first: Int, last: Int)
  fun onSelectionChange(selectedIndices: List<Int>)
  fun onSwipeAction(actionKey: String, index: Int, row: Int, side: String)
  fun onContextMenuAction(actionKey: String, index: Int, row: Int)
}

class FluxListView(context: Context) : ScrollView(context) {
  private val contentView = LinearLayout(context)
  private val searchView = EditText(context)
  private val topSpacer = Space(context)
  private val bottomSpacer = Space(context)
  private val reactChildren = mutableListOf<View>()
  private val rowContainers = mutableListOf<FrameLayout>()
  private val actionLayers = mutableMapOf<FrameLayout, FrameLayout>()
  private val contentFrames = mutableMapOf<FrameLayout, FrameLayout>()
  private val mountedRowIndices = mutableListOf<Int>()
  private val rowItemIndices = mutableListOf<Int>()
  private val selectedItemIndices = mutableSetOf<Int>()
  private val itemHeightsByRow = mutableMapOf<Int, Int>()
  private val longPressHandler = Handler(Looper.getMainLooper())
  private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop

  var eventListener: FluxListEventListener? = null

  private var itemCount = 0
  private var estimatedItemHeightPx = PixelUtil.toPixelFromDIP(72f).toInt()
  private var searchEnabled = false
  private var searchPlaceholder = "Search"
  private var editing = false
  private var allowsMultipleSelectionDuringEditing = true
  private var smoothTransitions = false
  private var selectionTintColor = Color.rgb(0, 122, 255)
  private var itemSignature = ""
  private var leadingActions = emptyList<FluxListAction>()
  private var trailingActions = emptyList<FluxListAction>()
  private var contextMenuActions = emptyList<FluxListAction>()
  private var lastVisibleFirst = Int.MIN_VALUE
  private var lastVisibleLast = Int.MIN_VALUE
  private var suppressSearchEvent = false
  private var activeTouchState: TouchState? = null
  private val selectionControlTag = "FluxListSelectionControl"

  init {
    isFillViewport = true
    clipChildren = true
    clipToPadding = true
    contentView.orientation = LinearLayout.VERTICAL
    addView(
      contentView,
      LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
    )

    searchView.setSingleLine(true)
    searchView.imeOptions = EditorInfo.IME_ACTION_SEARCH
    searchView.setTextColor(Color.rgb(17, 17, 20))
    searchView.setHintTextColor(Color.rgb(111, 115, 123))
    searchView.setPadding(dp(16), 0, dp(16), 0)
    searchView.setBackgroundColor(Color.TRANSPARENT)
    searchView.addTextChangedListener(
      object : TextWatcher {
        override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
        override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
          if (!suppressSearchEvent) {
            eventListener?.onSearchChange(s?.toString().orEmpty())
          }
        }

        override fun afterTextChanged(s: Editable?) = Unit
      }
    )

    rebuildContent()
  }

  fun addReactSubview(child: View, index: Int) {
    val safeIndex = index.coerceIn(0, reactChildren.size)
    if (child.parent is ViewGroup) {
      (child.parent as ViewGroup).removeView(child)
    }

    val container = FrameLayout(context)
    container.clipChildren = false
    container.clipToPadding = false
    val actionLayer = FrameLayout(context)
    val contentFrame = FrameLayout(context)
    contentFrame.clipChildren = false
    contentFrame.clipToPadding = false

    contentFrame.addView(
      child,
      FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.MATCH_PARENT
      )
    )
    container.addView(
      actionLayer,
      FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.MATCH_PARENT
      )
    )
    container.addView(
      contentFrame,
      FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.MATCH_PARENT
      )
    )

    reactChildren.add(safeIndex, child)
    rowContainers.add(safeIndex, container)
    actionLayers[container] = actionLayer
    contentFrames[container] = contentFrame
    rebuildContent()
  }

  fun removeReactSubviewAt(index: Int) {
    if (index !in reactChildren.indices) {
      return
    }

    val container = rowContainers.removeAt(index)
    actionLayers.remove(container)
    contentFrames.remove(container)
    container.removeAllViews()
    reactChildren.removeAt(index)
    rebuildContent()
  }

  fun getReactSubviewAt(index: Int): View? = reactChildren.getOrNull(index)

  fun getReactSubviewCount(): Int = reactChildren.size

  fun setItemCount(value: Int) {
    itemCount = max(0, value)
    rebuildContent()
    emitVisibleRangeIfNeeded()
  }

  fun setItemSignature(value: String?) {
    val next = value.orEmpty()
    if (itemSignature == next) {
      return
    }
    itemSignature = next
    rebuildContent()
  }

  fun setEditing(value: Boolean) {
    if (editing == value) {
      return
    }
    editing = value
    updateRows()
  }

  fun setAllowsMultipleSelectionDuringEditing(value: Boolean) {
    allowsMultipleSelectionDuringEditing = value
  }

  fun setSmoothTransitions(value: Boolean) {
    smoothTransitions = value
    contentView.layoutTransition = if (value) {
      LayoutTransition().apply {
        enableTransitionType(LayoutTransition.CHANGING)
      }
    } else {
      null
    }
  }

  fun setSelectionTintColor(value: Int?) {
    selectionTintColor = value ?: Color.rgb(0, 122, 255)
    updateRows()
  }

  fun setEstimatedItemHeight(value: Double) {
    val nextHeight = PixelUtil.toPixelFromDIP(value.toFloat()).toInt()
    estimatedItemHeightPx = max(1, nextHeight)
    rebuildContent()
  }

  fun setItemHeights(value: ReadableArray?) {
    itemHeightsByRow.clear()
    if (value != null) {
      val count = min(value.size(), mountedRowIndices.size)
      for (index in 0 until count) {
        val row = mountedRowIndices[index]
        val height = PixelUtil.toPixelFromDIP(value.getDouble(index).toFloat()).toInt()
        if (height > 0) {
          itemHeightsByRow[row] = height
        }
      }
    }
    rebuildContent()
  }

  fun setMountedRowIndices(value: ReadableArray?) {
    mountedRowIndices.clear()
    if (value != null) {
      for (index in 0 until value.size()) {
        mountedRowIndices.add(value.getInt(index))
      }
    }
    rebuildContent()
  }

  fun setRowItemIndices(value: ReadableArray?) {
    rowItemIndices.clear()
    if (value != null) {
      for (index in 0 until value.size()) {
        rowItemIndices.add(value.getInt(index))
      }
    }
    updateRows()
  }

  fun setSelectedItemIndices(value: ReadableArray?) {
    selectedItemIndices.clear()
    if (value != null) {
      for (index in 0 until value.size()) {
        selectedItemIndices.add(value.getInt(index))
      }
    }
    updateRows()
  }

  fun setSearchEnabled(value: Boolean) {
    if (searchEnabled == value) {
      return
    }
    searchEnabled = value
    if (!value && searchView.text.isNotEmpty()) {
      suppressSearchEvent = true
      searchView.text.clear()
      suppressSearchEvent = false
      eventListener?.onSearchChange("")
    }
    rebuildContent()
  }

  fun setSearchPlaceholder(value: String?) {
    searchPlaceholder = value ?: "Search"
    searchView.hint = searchPlaceholder
  }

  fun setSwipeActions(value: ReadableMap?) {
    leadingActions = value?.getActionArray("leading").orEmpty()
    trailingActions = value?.getActionArray("trailing").orEmpty()
    updateRows()
  }

  fun setContextMenuActions(value: ReadableArray?) {
    contextMenuActions = value.toFluxListActions()
    updateRows()
  }

  override fun onScrollChanged(left: Int, top: Int, oldLeft: Int, oldTop: Int) {
    super.onScrollChanged(left, top, oldLeft, oldTop)
    emitVisibleRangeIfNeeded()
  }

  private fun rebuildContent() {
    contentView.removeAllViews()

    if (searchEnabled) {
      searchView.hint = searchPlaceholder
      contentView.addView(
        searchView,
        LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.MATCH_PARENT,
          dp(48)
        )
      )
    } else if (searchView.parent === contentView) {
      contentView.removeView(searchView)
    }

    contentView.addView(
      topSpacer,
      LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        topSpacerHeight()
      )
    )

    rowContainers.forEachIndexed { index, container ->
      contentView.addView(
        container,
        LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.MATCH_PARENT,
          rowHeightForMountedIndex(index)
        )
      )
    }

    contentView.addView(
      bottomSpacer,
      LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        bottomSpacerHeight()
      )
    )

    updateRows()
    requestLayout()
  }

  private fun updateRows() {
    rowContainers.forEachIndexed { index, container ->
      val row = rowForMountedIndex(index)
      val itemIndex = itemIndexForMountedIndex(index)
      val selected = selectedItemIndices.contains(itemIndex)
      updateRowSwipeChrome(container)
      updateRowSelectionChrome(container, selected)
      container.setOnClickListener(
        if (editing) {
          View.OnClickListener { toggleSelection(itemIndex) }
        } else {
          null
        }
      )
      container.contentDescription = "FluxList row $row"
    }
  }

  private fun updateRowSelectionChrome(container: FrameLayout, selected: Boolean) {
    val selector = ensureSelectionControl(container)
    selector.visibility = if (editing) View.VISIBLE else View.GONE
    selector.text = if (selected) "\u2713" else ""
    selector.setTextColor(Color.WHITE)
    selector.background = selectionControlBackground(selected)
    selector.animate()
      .setStartDelay(0L)
      .scaleX(if (selected) 1f else 0.94f)
      .scaleY(if (selected) 1f else 0.94f)
      .alpha(if (editing) 1f else 0f)
      .setDuration(120L)
      .start()

    val reactChild = contentFrames[container]
    val targetTranslation = if (editing) dp(44).toFloat() else 0f
    reactChild?.animate()
      ?.setStartDelay(0L)
      ?.translationX(targetTranslation)
      ?.setDuration(180L)
      ?.start()
  }

  private fun ensureSelectionControl(container: FrameLayout): TextView {
    val existing = (0 until container.childCount)
      .map { container.getChildAt(it) }
      .filterIsInstance<TextView>()
      .firstOrNull { it.tag == selectionControlTag }
    if (existing != null) {
      return existing
    }

    val selector = TextView(context)
    selector.tag = selectionControlTag
    selector.gravity = Gravity.CENTER
    selector.includeFontPadding = false
    selector.isClickable = false
    selector.isFocusable = false
    selector.textSize = 15f
    selector.typeface = Typeface.DEFAULT_BOLD
    val params = FrameLayout.LayoutParams(dp(24), dp(24))
    params.gravity = Gravity.START or Gravity.CENTER_VERTICAL
    params.leftMargin = dp(12)
    container.addView(selector, params)
    return selector
  }

  private fun selectionControlBackground(selected: Boolean): GradientDrawable {
    return GradientDrawable().apply {
      shape = GradientDrawable.OVAL
      if (selected) {
        setColor(selectionTintColor)
        setStroke(dp(1), selectionTintColor)
      } else {
        setColor(Color.TRANSPARENT)
        setStroke(dp(2), Color.rgb(142, 142, 147))
      }
    }
  }

  override fun dispatchTouchEvent(event: MotionEvent): Boolean {
    if (!editing) {
      return super.dispatchTouchEvent(event)
    }

    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        activeTouchState = rowContainerAt(event.x, event.y)?.let {
          TouchState(row = it).apply {
            startX = event.rawX
            startY = event.rawY
          }
        }
      }
      MotionEvent.ACTION_MOVE -> {
        val state = activeTouchState
        if (state != null) {
          val dx = event.rawX - state.startX
          val dy = event.rawY - state.startY
          if (abs(dx) > touchSlop || abs(dy) > touchSlop) {
            state.moved = true
          }
        }
      }
      MotionEvent.ACTION_UP -> {
        val state = activeTouchState
        activeTouchState = null
        if (state?.row != null && !state.moved && !state.longPressTriggered) {
          val mountedIndex = rowContainers.indexOf(state.row)
          if (mountedIndex != -1) {
            toggleSelection(itemIndexForMountedIndex(mountedIndex))
            return true
          }
        }
      }
      MotionEvent.ACTION_CANCEL -> {
        activeTouchState = null
      }
    }

    return super.dispatchTouchEvent(event)
  }

  override fun onInterceptTouchEvent(event: MotionEvent): Boolean {
    if (editing || (leadingActions.isEmpty() && trailingActions.isEmpty())) {
      return super.onInterceptTouchEvent(event)
    }

    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        val row = rowContainerAt(event.x, event.y)
        activeTouchState = row?.let {
          TouchState(row = it).apply {
            startX = event.rawX
            startY = event.rawY
            longPressRunnable = Runnable {
              val mountedIndex = rowContainers.indexOf(row)
              if (mountedIndex != -1 && !swiping) {
                longPressTriggered = true
                if (!editing) {
                  editing = true
                }
                toggleSelection(itemIndexForMountedIndex(mountedIndex))
              }
            }
          }
        }
        activeTouchState?.longPressRunnable?.let {
          longPressHandler.postDelayed(it, 500L)
        }
        super.onInterceptTouchEvent(event)
        return false
      }
      MotionEvent.ACTION_MOVE -> {
        val state = activeTouchState ?: return super.onInterceptTouchEvent(event)
        val dx = event.rawX - state.startX
        val dy = event.rawY - state.startY
        if (!state.swiping && abs(dx) > dp(18) && abs(dx) > abs(dy)) {
          state.swiping = true
          state.longPressRunnable?.let(longPressHandler::removeCallbacks)
          requestDisallowInterceptTouchEvent(true)
          parent?.requestDisallowInterceptTouchEvent(true)
          return true
        }
        if (abs(dy) > dp(10) && abs(dy) > abs(dx)) {
          state.longPressRunnable?.let(longPressHandler::removeCallbacks)
        }
      }
      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
        activeTouchState?.longPressRunnable?.let(longPressHandler::removeCallbacks)
        activeTouchState = null
      }
    }

    return super.onInterceptTouchEvent(event)
  }

  override fun onTouchEvent(event: MotionEvent): Boolean {
    val state = activeTouchState
    if (state?.swiping == true) {
      return handleSwipeTouch(state, event)
    }

    return super.onTouchEvent(event)
  }

  private fun handleSwipeTouch(state: TouchState, event: MotionEvent): Boolean {
    if (editing || (leadingActions.isEmpty() && trailingActions.isEmpty())) {
      return false
    }

    val row = state.row ?: return false
    val foreground = contentFrames[row] ?: return false
    when (event.actionMasked) {
      MotionEvent.ACTION_MOVE -> {
        val dx = event.rawX - state.startX
        foreground.animate().cancel()
        applySwipeProgress(row, foreground, dx)
        return true
      }
      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
        val dx = event.rawX - state.startX
        val side = if (dx > 0) "leading" else "trailing"
        val actions = if (dx > 0) leadingActions else trailingActions
        val shouldCommit =
          event.actionMasked == MotionEvent.ACTION_UP &&
            actions.isNotEmpty() &&
            abs(dx) >= max(width * 0.42f, dp(96).toFloat())
        if (shouldCommit) {
          commitSwipe(row, foreground, actions.first(), side, dx)
        } else {
          resetSwipe(row, foreground)
        }
        requestDisallowInterceptTouchEvent(false)
        parent?.requestDisallowInterceptTouchEvent(false)
        state.swiping = false
        activeTouchState = null
        return true
      }
    }

    return false
  }

  private fun applySwipeProgress(row: FrameLayout, foreground: View, dx: Float) {
    val action = actionForDx(dx) ?: return
    val actionLayer = actionLayers[row]
    actionLayer?.setBackgroundColor(action.color ?: defaultActionColor(action))
    foreground.translationX = dx.coerceIn(-width.toFloat(), width.toFloat())
  }

  private fun resetSwipe(row: FrameLayout, foreground: View) {
    foreground.animate()
      .setStartDelay(0L)
      .translationX(0f)
      .setDuration(180L)
      .withEndAction {
        actionLayers[row]?.setBackgroundColor(Color.TRANSPARENT)
      }
      .start()
  }

  private fun commitSwipe(
    row: FrameLayout,
    foreground: View,
    action: FluxListAction,
    side: String,
    dx: Float
  ) {
    val target = width.toFloat() * dx.sign
    actionLayers[row]?.setBackgroundColor(action.color ?: defaultActionColor(action))
    foreground.animate()
      .setStartDelay(0L)
      .translationX(target)
      .setDuration(180L)
      .withEndAction {
        emitSwipeAction(row, action, side)
        foreground.animate()
          .translationX(0f)
          .setStartDelay(80L)
          .setDuration(160L)
          .withEndAction {
            actionLayers[row]?.setBackgroundColor(Color.TRANSPARENT)
          }
          .start()
      }
      .start()
  }

  private fun actionForDx(dx: Float): FluxListAction? {
    return if (dx > 0) {
      leadingActions.firstOrNull()
    } else {
      trailingActions.firstOrNull()
    }
  }

  private fun emitSwipeAction(view: View, action: FluxListAction, side: String) {
    val mountedIndex = rowContainers.indexOf(view)
    if (mountedIndex == -1) {
      return
    }
    val row = rowForMountedIndex(mountedIndex)
    val itemIndex = itemIndexForMountedIndex(mountedIndex)
    eventListener?.onSwipeAction(action.key, itemIndex, row, side)
  }

  private fun updateRowSwipeChrome(container: FrameLayout) {
    val actionLayer = actionLayers[container] ?: return
    actionLayer.removeAllViews()
    if (leadingActions.isEmpty() && trailingActions.isEmpty()) {
      actionLayer.visibility = View.GONE
      return
    }

    actionLayer.visibility = View.VISIBLE
    addActionGroup(actionLayer, leadingActions, Gravity.START)
    addActionGroup(actionLayer, trailingActions, Gravity.END)
  }

  private fun addActionGroup(parent: FrameLayout, actions: List<FluxListAction>, gravity: Int) {
    if (actions.isEmpty()) {
      return
    }

    val group = LinearLayout(context)
    group.orientation = LinearLayout.HORIZONTAL
    group.gravity = Gravity.CENTER
    actions.forEach { action ->
      group.addView(
        createActionView(action),
        LinearLayout.LayoutParams(dp(82), LinearLayout.LayoutParams.MATCH_PARENT)
      )
    }

    val params = FrameLayout.LayoutParams(
      dp(82) * actions.size,
      FrameLayout.LayoutParams.MATCH_PARENT
    )
    params.gravity = gravity or Gravity.CENTER_VERTICAL
    parent.addView(group, params)
  }

  private fun createActionView(action: FluxListAction): TextView {
    return TextView(context).apply {
      gravity = Gravity.CENTER
      text = action.title
      textSize = 13f
      setTextColor(Color.WHITE)
      setBackgroundColor(action.color ?: defaultActionColor(action))
      typeface = android.graphics.Typeface.DEFAULT_BOLD
    }
  }

  private fun defaultActionColor(action: FluxListAction): Int {
    return if (action.destructive) {
      Color.rgb(255, 59, 48)
    } else {
      Color.rgb(117, 117, 122)
    }
  }

  private fun showContextMenu(anchor: View, mountedIndex: Int) {
    val row = rowForMountedIndex(mountedIndex)
    val itemIndex = itemIndexForMountedIndex(mountedIndex)
    val popup = PopupMenu(context, anchor)
    contextMenuActions.forEachIndexed { index, action ->
      popup.menu.add(0, index, index, action.title)
    }
    popup.setOnMenuItemClickListener { menuItem ->
      val action = contextMenuActions.getOrNull(menuItem.itemId)
      if (action != null) {
        eventListener?.onContextMenuAction(action.key, itemIndex, row)
        true
      } else {
        false
      }
    }
    popup.show()
  }

  private fun toggleSelection(itemIndex: Int) {
    if (itemIndex < 0) {
      return
    }
    if (selectedItemIndices.contains(itemIndex)) {
      selectedItemIndices.remove(itemIndex)
    } else {
      if (!allowsMultipleSelectionDuringEditing) {
        selectedItemIndices.clear()
      }
      selectedItemIndices.add(itemIndex)
    }
    updateRows()
    eventListener?.onSelectionChange(selectedItemIndices.sorted())
  }

  private fun emitVisibleRangeIfNeeded() {
    if (itemCount <= 0 || estimatedItemHeightPx <= 0) {
      return
    }

    val searchHeight = if (searchEnabled) searchView.height else 0
    val listTop = max(0, scrollY - searchHeight)
    val first = (listTop / estimatedItemHeightPx).coerceIn(0, itemCount - 1)
    val visibleRows = max(1, ((height + estimatedItemHeightPx - 1) / estimatedItemHeightPx) + 1)
    val last = min(itemCount - 1, first + visibleRows)
    if (first == lastVisibleFirst && last == lastVisibleLast) {
      return
    }
    lastVisibleFirst = first
    lastVisibleLast = last
    eventListener?.onVisibleRangeChange(first, last)
  }

  private fun topSpacerHeight(): Int {
    val firstRow = mountedRowIndices.minOrNull() ?: 0
    return max(0, firstRow * estimatedItemHeightPx)
  }

  private fun bottomSpacerHeight(): Int {
    if (itemCount <= 0) {
      return 0
    }
    val lastRow = mountedRowIndices.maxOrNull() ?: (rowContainers.size - 1)
    return max(0, (itemCount - lastRow - 1) * estimatedItemHeightPx)
  }

  private fun rowHeightForMountedIndex(index: Int): Int {
    val row = rowForMountedIndex(index)
    return itemHeightsByRow[row] ?: estimatedItemHeightPx
  }

  private fun rowForMountedIndex(index: Int): Int {
    return mountedRowIndices.getOrNull(index) ?: index
  }

  private fun itemIndexForMountedIndex(index: Int): Int {
    return rowItemIndices.getOrNull(index) ?: rowForMountedIndex(index)
  }

  private fun rowContainerAt(x: Float, y: Float): FrameLayout? {
    val contentY = y + scrollY - contentView.top
    rowContainers.forEach { row ->
      if (
        x >= row.left &&
        x <= row.right &&
        contentY >= row.top &&
        contentY <= row.bottom
      ) {
        return row
      }
    }
    return null
  }

  private fun dp(value: Int): Int = PixelUtil.toPixelFromDIP(value.toFloat()).toInt()

  private fun ReadableMap.getActionArray(key: String): List<FluxListAction> {
    if (!hasKey(key) || isNull(key)) {
      return emptyList()
    }
    return getArray(key).toFluxListActions()
  }

  private fun ReadableArray?.toFluxListActions(): List<FluxListAction> {
    if (this == null) {
      return emptyList()
    }

    val actions = mutableListOf<FluxListAction>()
    for (index in 0 until size()) {
      val action = getMap(index) ?: continue
      val key = if (action.hasKey("key")) action.getString("key").orEmpty() else ""
      val title = if (action.hasKey("title")) action.getString("title").orEmpty() else ""
      val color = action.getOptionalColor("color")
      val destructive =
        action.hasKey("destructive") && !action.isNull("destructive") && action.getBoolean("destructive")
      if (key.isNotEmpty() && title.isNotEmpty()) {
        actions.add(FluxListAction(key = key, title = title, color = color, destructive = destructive))
      }
    }
    return actions
  }

  private fun ReadableMap.getOptionalColor(key: String): Int? {
    if (!hasKey(key) || isNull(key)) {
      return null
    }

    return when (getType(key)) {
      ReadableType.Number -> getInt(key)
      ReadableType.String -> {
        try {
          Color.parseColor(getString(key))
        } catch (_: IllegalArgumentException) {
          null
        }
      }
      else -> null
    }
  }

  private class TouchState(var row: FrameLayout? = null) {
    var startX = 0f
    var startY = 0f
    var moved = false
    var swiping = false
    var longPressTriggered = false
    var longPressRunnable: Runnable? = null
  }
}
