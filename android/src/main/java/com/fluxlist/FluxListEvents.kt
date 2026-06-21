package com.fluxlist

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

class FluxListSearchChangeEvent(
  surfaceId: Int,
  viewTag: Int,
  private val query: String,
) : Event<FluxListSearchChangeEvent>(surfaceId, viewTag) {
  override fun getEventName(): String = "topSearchChange"

  override fun getEventData(): WritableMap =
    Arguments.createMap().apply {
      putString("query", query)
    }
}

class FluxListVisibleRangeChangeEvent(
  surfaceId: Int,
  viewTag: Int,
  private val first: Int,
  private val last: Int,
) : Event<FluxListVisibleRangeChangeEvent>(surfaceId, viewTag) {
  override fun getEventName(): String = "topVisibleRangeChange"

  override fun getEventData(): WritableMap =
    Arguments.createMap().apply {
      putInt("first", first)
      putInt("last", last)
    }
}

class FluxListSelectionChangeEvent(
  surfaceId: Int,
  viewTag: Int,
  private val selectedIndices: List<Int>,
) : Event<FluxListSelectionChangeEvent>(surfaceId, viewTag) {
  override fun getEventName(): String = "topSelectionChange"

  override fun getEventData(): WritableMap =
    Arguments.createMap().apply {
      val indices = Arguments.createArray()
      selectedIndices.forEach { indices.pushInt(it) }
      putArray("selectedIndices", indices)
    }
}

class FluxListSwipeActionEvent(
  surfaceId: Int,
  viewTag: Int,
  private val actionKey: String,
  private val index: Int,
  private val row: Int,
  private val side: String,
) : Event<FluxListSwipeActionEvent>(surfaceId, viewTag) {
  override fun getEventName(): String = "topSwipeAction"

  override fun getEventData(): WritableMap =
    Arguments.createMap().apply {
      putString("actionKey", actionKey)
      putInt("index", index)
      putInt("row", row)
      putString("side", side)
    }
}

class FluxListContextMenuActionEvent(
  surfaceId: Int,
  viewTag: Int,
  private val actionKey: String,
  private val index: Int,
  private val row: Int,
) : Event<FluxListContextMenuActionEvent>(surfaceId, viewTag) {
  override fun getEventName(): String = "topContextMenuAction"

  override fun getEventData(): WritableMap =
    Arguments.createMap().apply {
      putString("actionKey", actionKey)
      putInt("index", index)
      putInt("row", row)
    }
}
