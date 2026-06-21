package com.fluxlist

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.FluxListViewManagerInterface
import com.facebook.react.viewmanagers.FluxListViewManagerDelegate
import android.view.View
import java.util.HashMap

@ReactModule(name = FluxListViewManager.NAME)
class FluxListViewManager : ViewGroupManager<FluxListView>(),
  FluxListViewManagerInterface<FluxListView> {
  private val mDelegate: ViewManagerDelegate<FluxListView>

  init {
    mDelegate = FluxListViewManagerDelegate(this)
  }

  override fun getDelegate(): ViewManagerDelegate<FluxListView>? {
    return mDelegate
  }

  override fun getName(): String {
    return NAME
  }

  public override fun createViewInstance(context: ThemedReactContext): FluxListView {
    return FluxListView(context)
  }

  override fun addView(parent: FluxListView, child: View, index: Int) {
    parent.addReactSubview(child, index)
  }

  override fun getChildAt(parent: FluxListView, index: Int): View? {
    return parent.getReactSubviewAt(index)
  }

  override fun getChildCount(parent: FluxListView): Int {
    return parent.getReactSubviewCount()
  }

  override fun removeViewAt(parent: FluxListView, index: Int) {
    parent.removeReactSubviewAt(index)
  }

  override fun needsCustomLayoutForChildren(): Boolean {
    return true
  }

  override fun addEventEmitters(reactContext: ThemedReactContext, view: FluxListView) {
    view.eventListener =
      object : FluxListEventListener {
        override fun onSearchChange(query: String) {
          dispatchEvent(reactContext, view) {
            FluxListSearchChangeEvent(UIManagerHelper.getSurfaceId(view), view.id, query)
          }
        }

        override fun onVisibleRangeChange(first: Int, last: Int) {
          dispatchEvent(reactContext, view) {
            FluxListVisibleRangeChangeEvent(UIManagerHelper.getSurfaceId(view), view.id, first, last)
          }
        }

        override fun onSelectionChange(selectedIndices: List<Int>) {
          dispatchEvent(reactContext, view) {
            FluxListSelectionChangeEvent(
              UIManagerHelper.getSurfaceId(view),
              view.id,
              selectedIndices
            )
          }
        }

        override fun onSwipeAction(actionKey: String, index: Int, row: Int, side: String) {
          dispatchEvent(reactContext, view) {
            FluxListSwipeActionEvent(
              UIManagerHelper.getSurfaceId(view),
              view.id,
              actionKey,
              index,
              row,
              side
            )
          }
        }

        override fun onContextMenuAction(actionKey: String, index: Int, row: Int) {
          dispatchEvent(reactContext, view) {
            FluxListContextMenuActionEvent(
              UIManagerHelper.getSurfaceId(view),
              view.id,
              actionKey,
              index,
              row
            )
          }
        }
      }
  }

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
    val constants = super.getExportedCustomDirectEventTypeConstants() ?: HashMap()
    constants.putAll(
      mapOf(
        "topSearchChange" to mapOf("registrationName" to "onSearchChange"),
        "topVisibleRangeChange" to mapOf("registrationName" to "onVisibleRangeChange"),
        "topSelectionChange" to mapOf("registrationName" to "onSelectionChange"),
        "topSwipeAction" to mapOf("registrationName" to "onSwipeAction"),
        "topContextMenuAction" to mapOf("registrationName" to "onContextMenuAction")
      )
    )
    return constants
  }

  @ReactProp(name = "itemCount")
  override fun setItemCount(view: FluxListView?, value: Int) {
    view?.setItemCount(value)
  }

  @ReactProp(name = "itemSignature")
  override fun setItemSignature(view: FluxListView?, value: String?) {
    view?.setItemSignature(value)
  }

  @ReactProp(name = "editing")
  override fun setEditing(view: FluxListView?, value: Boolean) {
    view?.setEditing(value)
  }

  @ReactProp(name = "allowsMultipleSelectionDuringEditing")
  override fun setAllowsMultipleSelectionDuringEditing(view: FluxListView?, value: Boolean) {
    view?.setAllowsMultipleSelectionDuringEditing(value)
  }

  @ReactProp(name = "selectionTintColor", customType = "Color")
  override fun setSelectionTintColor(view: FluxListView?, value: Int?) {
    view?.setSelectionTintColor(value)
  }

  @ReactProp(name = "smoothTransitions")
  override fun setSmoothTransitions(view: FluxListView?, value: Boolean) {
    view?.setSmoothTransitions(value)
  }

  @ReactProp(name = "estimatedItemHeight")
  override fun setEstimatedItemHeight(view: FluxListView?, value: Double) {
    view?.setEstimatedItemHeight(value)
  }

  @ReactProp(name = "itemHeights")
  override fun setItemHeights(view: FluxListView?, value: ReadableArray?) {
    view?.setItemHeights(value)
  }

  @ReactProp(name = "mountedRowIndices")
  override fun setMountedRowIndices(view: FluxListView?, value: ReadableArray?) {
    view?.setMountedRowIndices(value)
  }

  @ReactProp(name = "rowItemIndices")
  override fun setRowItemIndices(view: FluxListView?, value: ReadableArray?) {
    view?.setRowItemIndices(value)
  }

  @ReactProp(name = "selectedItemIndices")
  override fun setSelectedItemIndices(view: FluxListView?, value: ReadableArray?) {
    view?.setSelectedItemIndices(value)
  }

  @ReactProp(name = "searchEnabled")
  override fun setSearchEnabled(view: FluxListView?, value: Boolean) {
    view?.setSearchEnabled(value)
  }

  @ReactProp(name = "searchPlaceholder")
  override fun setSearchPlaceholder(view: FluxListView?, value: String?) {
    view?.setSearchPlaceholder(value)
  }

  @ReactProp(name = "swipeActions")
  override fun setSwipeActions(view: FluxListView?, value: ReadableMap?) {
    view?.setSwipeActions(value)
  }

  @ReactProp(name = "contextMenuActions")
  override fun setContextMenuActions(view: FluxListView?, value: ReadableArray?) {
    view?.setContextMenuActions(value)
  }

  private fun dispatchEvent(
    reactContext: ThemedReactContext,
    view: FluxListView,
    eventFactory: () -> com.facebook.react.uimanager.events.Event<*>
  ) {
    if (view.id == View.NO_ID) {
      return
    }
    val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, view.id)
    dispatcher?.dispatchEvent(eventFactory())
  }

  companion object {
    const val NAME = "FluxListView"
  }
}
