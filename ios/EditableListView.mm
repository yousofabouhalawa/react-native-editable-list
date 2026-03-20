#import "EditableListView.h"

#import <React/RCTConversions.h>
#import <QuartzCore/QuartzCore.h>
#import <react/renderer/components/EditableListViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/EditableListViewSpec/EventEmitters.h>
#import <react/renderer/components/EditableListViewSpec/Props.h>
#import <react/renderer/components/EditableListViewSpec/RCTComponentViewHelpers.h>

#import "RCTFabricComponentsPlugins.h"

using namespace facebook::react;

@interface EditableListSwipeAction : NSObject
@property (nonatomic, copy) NSString *key;
@property (nonatomic, copy) NSString *title;
@property (nonatomic, strong, nullable) UIColor *color;
@property (nonatomic, copy, nullable) NSString *icon;
@property (nonatomic, assign) BOOL destructive;
@end

@implementation EditableListSwipeAction
@end

static UIColor *EditableListDefaultActionBackgroundColor(BOOL destructive)
{
  return destructive ? UIColor.systemRedColor : UIColor.systemBlueColor;
}

static UIColor *EditableListResolvedActionBackgroundColor(EditableListSwipeAction *action)
{
  UIColor *fallbackColor = EditableListDefaultActionBackgroundColor(action.destructive);
  UIColor *backgroundColor = action.color ?: fallbackColor;
  CGFloat alpha = CGColorGetAlpha(backgroundColor.CGColor);
  if (alpha <= 0.01) {
    return fallbackColor;
  }
  return backgroundColor;
}

static UIColor *EditableListForegroundColorForBackground(UIColor *backgroundColor)
{
  CGFloat red = 0.0;
  CGFloat green = 0.0;
  CGFloat blue = 0.0;
  CGFloat alpha = 0.0;
  if (![backgroundColor getRed:&red green:&green blue:&blue alpha:&alpha]) {
    return UIColor.whiteColor;
  }

  CGFloat luminance = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
  return luminance > 0.62 ? UIColor.blackColor : UIColor.whiteColor;
}

static UIImage * _Nullable EditableListCombinedIconTitleImage(
    UIImage *iconImage,
    NSString *title,
    UIColor *foregroundColor)
{
  if (!iconImage || title.length == 0) {
    return nil;
  }

  UIFont *font = [UIFont systemFontOfSize:13.0 weight:UIFontWeightSemibold];
  NSDictionary<NSAttributedStringKey, id> *attributes = @{
    NSFontAttributeName : font,
    NSForegroundColorAttributeName : foregroundColor,
  };
  CGSize textSize = [title sizeWithAttributes:attributes];
  CGFloat spacing = 4.0;
  CGFloat width = ceil(MAX(iconImage.size.width, textSize.width));
  CGFloat height = ceil(iconImage.size.height + spacing + textSize.height);
  if (width <= 0.0 || height <= 0.0) {
    return nil;
  }

  UIGraphicsImageRendererFormat *format = [UIGraphicsImageRendererFormat defaultFormat];
  format.scale = UIScreen.mainScreen.scale;
  UIGraphicsImageRenderer *renderer =
      [[UIGraphicsImageRenderer alloc] initWithSize:CGSizeMake(width, height)
                                             format:format];
  return [renderer imageWithActions:^(UIGraphicsImageRendererContext * _Nonnull context) {
    CGFloat iconX = floor((width - iconImage.size.width) * 0.5);
    [iconImage drawInRect:CGRectMake(iconX, 0.0, iconImage.size.width, iconImage.size.height)];
    CGFloat textX = floor((width - textSize.width) * 0.5);
    CGFloat textY = iconImage.size.height + spacing;
    [title drawAtPoint:CGPointMake(textX, textY)
        withAttributes:attributes];
  }];
}

static BOOL EditableListShouldAnimateDeleteAction(EditableListSwipeAction *action)
{
  if (!action.destructive) {
    return NO;
  }
  if (action.key.length == 0) {
    return YES;
  }
  NSRange deleteRange = [action.key rangeOfString:@"delete" options:NSCaseInsensitiveSearch];
  return deleteRange.location != NSNotFound;
}

template <typename ActionVector>
static NSArray<EditableListSwipeAction *> *EditableListSwipeActionArrayFromVector(
    const ActionVector &actions)
{
  NSMutableArray<EditableListSwipeAction *> *result = [NSMutableArray new];
  for (const auto &action : actions) {
    EditableListSwipeAction *item = [EditableListSwipeAction new];
    item.key = [NSString stringWithUTF8String:action.key.c_str()];
    item.title = [NSString stringWithUTF8String:action.title.c_str()];
    if (action.color) {
      item.color = RCTUIColorFromSharedColor(action.color);
    }
    if (!action.icon.empty()) {
      item.icon = [NSString stringWithUTF8String:action.icon.c_str()];
    }
    item.destructive = action.destructive;
    [result addObject:item];
  }
  return result;
}

@implementation EditableListView {
    UIView * _containerView;
    UITableView * _tableView;
    UISearchBar * _searchBar;
    NSMutableArray<UIView *> * _itemViews;
    NSMutableArray<NSNumber *> * _itemHeights;
    NSMutableArray<NSNumber *> * _rowItemIndices;
    NSArray * _leadingSwipeActions;
    NSArray * _trailingSwipeActions;
    BOOL _searchEnabled;
    NSString * _searchPlaceholder;
    __weak UIView * _pendingNativeDeleteView;
    BOOL _hasPendingNativeDelete;
    BOOL _isAnimatingNativeDelete;
    BOOL _reloadScheduled;
    BOOL _needsReloadAfterDeleteAnimation;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
    return concreteComponentDescriptorProvider<EditableListViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const EditableListViewProps>();
    _props = defaultProps;

    _itemViews = [NSMutableArray new];
    _itemHeights = [NSMutableArray new];
    _containerView = [[UIView alloc] initWithFrame:CGRectZero];
    _tableView = [[UITableView alloc] initWithFrame:CGRectZero style:UITableViewStylePlain];
    _tableView.dataSource = self;
    _tableView.delegate = self;
    _tableView.separatorStyle = UITableViewCellSeparatorStyleNone;
    _tableView.estimatedRowHeight = 72.0;
    _tableView.rowHeight = UITableViewAutomaticDimension;
    [_tableView registerClass:[UITableViewCell class]
       forCellReuseIdentifier:@"EditableListCell"];
    _searchEnabled = NO;
    _searchPlaceholder = @"Search";

    [_containerView addSubview:_tableView];
    self.contentView = _containerView;
  }

  return self;
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  _containerView.frame = self.bounds;
  _tableView.frame = _containerView.bounds;
  [self applySearchConfiguration];
}

- (void)reloadTableView
{
  if (_isAnimatingNativeDelete) {
    _needsReloadAfterDeleteAnimation = YES;
    return;
  }
  if (_reloadScheduled) {
    return;
  }
  _reloadScheduled = YES;
  dispatch_async(dispatch_get_main_queue(), ^{
    _reloadScheduled = NO;
    if (_isAnimatingNativeDelete) {
      _needsReloadAfterDeleteAnimation = YES;
      return;
    }
    [_tableView reloadData];
  });
}

- (UISearchBar *)ensureSearchBar
{
  if (_searchBar) {
    return _searchBar;
  }
  UISearchBar *searchBar = [[UISearchBar alloc] initWithFrame:CGRectZero];
  searchBar.delegate = self;
  searchBar.autocapitalizationType = UITextAutocapitalizationTypeNone;
  searchBar.autocorrectionType = UITextAutocorrectionTypeNo;
  searchBar.searchBarStyle = UISearchBarStyleMinimal;
  _searchBar = searchBar;
  return _searchBar;
}

- (void)applySearchConfiguration
{
  if (!_searchEnabled) {
    if (_searchBar) {
      if (_searchBar.text.length > 0) {
        _searchBar.text = @"";
        [self emitSearchChangeWithQuery:@""];
      }
      [_searchBar resignFirstResponder];
    }
    if (_tableView.tableHeaderView != nil) {
      _tableView.tableHeaderView = nil;
    }
    return;
  }

  UISearchBar *searchBar = [self ensureSearchBar];
  searchBar.placeholder = _searchPlaceholder ?: @"Search";
  [searchBar sizeToFit];

  CGRect frame = searchBar.frame;
  CGFloat targetWidth = CGRectGetWidth(_tableView.bounds);
  if (targetWidth > 0.0) {
    frame.size.width = targetWidth;
  }
  searchBar.frame = frame;
  if (_tableView.tableHeaderView != searchBar) {
    _tableView.tableHeaderView = searchBar;
  } else {
    CGFloat widthDelta = _tableView.tableHeaderView.frame.size.width - frame.size.width;
    if (widthDelta < 0.0) {
      widthDelta = -widthDelta;
    }
    if (widthDelta <= 0.5) {
      return;
    }
    _tableView.tableHeaderView = searchBar;
  }
}

- (void)resizeItemHeightsForCount:(NSUInteger)count
{
  NSMutableArray<NSNumber *> *nextHeights = [_itemHeights mutableCopy] ?: [NSMutableArray new];
  while (nextHeights.count < count) {
    [nextHeights addObject:@0];
  }
  while (nextHeights.count > count) {
    [nextHeights removeLastObject];
  }
  _itemHeights = nextHeights;
}

- (BOOL)animateNativeDeleteForRow:(NSInteger)row
                       completion:(void (^ _Nullable)(void))completion
{
  if (row < 0 || row >= _itemViews.count) {
    if (completion) {
      completion();
    }
    return NO;
  }
  NSInteger tableRowCount = 0;
  if (_tableView.numberOfSections > 0) {
    tableRowCount = [_tableView numberOfRowsInSection:0];
  }
  NSInteger dataRowCount = _itemViews.count;

  // If UIKit and backing data are already out of sync, skip animated delete to avoid crashes.
  if (tableRowCount <= 0 || row >= tableRowCount || tableRowCount != dataRowCount) {
    [_itemViews removeObjectAtIndex:row];
    if (row < _itemHeights.count) {
      [_itemHeights removeObjectAtIndex:row];
    }
    if (_rowItemIndices && row < _rowItemIndices.count) {
      [_rowItemIndices removeObjectAtIndex:row];
    }
    [self reloadTableView];
    if (completion) {
      completion();
    }
    return NO;
  }

  [_itemViews removeObjectAtIndex:row];
  if (row < _itemHeights.count) {
    [_itemHeights removeObjectAtIndex:row];
  }
  if (_rowItemIndices && row < _rowItemIndices.count) {
    [_rowItemIndices removeObjectAtIndex:row];
  }

  NSIndexPath *indexPath = [NSIndexPath indexPathForRow:row inSection:0];
  _isAnimatingNativeDelete = YES;
  [CATransaction begin];
  [CATransaction setCompletionBlock:^{
    _isAnimatingNativeDelete = NO;
    if (_needsReloadAfterDeleteAnimation) {
      _needsReloadAfterDeleteAnimation = NO;
      [self reloadTableView];
    }
    if (completion) {
      completion();
    }
  }];
  @try {
    [_tableView beginUpdates];
    [_tableView deleteRowsAtIndexPaths:@[ indexPath ]
                      withRowAnimation:UITableViewRowAnimationLeft];
    [_tableView endUpdates];
  } @catch (NSException *exception) {
    [CATransaction commit];
    [self reloadTableView];
    _isAnimatingNativeDelete = NO;
    return NO;
  }
  [CATransaction commit];
  return YES;
}

- (void)markPendingNativeDeleteForView:(UIView *)view
{
  if (!view) {
    _pendingNativeDeleteView = nil;
    _hasPendingNativeDelete = NO;
    return;
  }
  _pendingNativeDeleteView = view;
  _hasPendingNativeDelete = YES;
}

- (void)clearPendingNativeDelete
{
  _pendingNativeDeleteView = nil;
  _hasPendingNativeDelete = NO;
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView
                          index:(NSInteger)index
{
  NSNumber *existingHeight = @0;
  NSUInteger existingIndex = [_itemViews indexOfObjectIdenticalTo:childComponentView];
  if (existingIndex != NSNotFound) {
    if (existingIndex < _itemHeights.count) {
      existingHeight = _itemHeights[existingIndex];
    }
    [_itemViews removeObjectAtIndex:existingIndex];
    if (existingIndex < _itemHeights.count) {
      [_itemHeights removeObjectAtIndex:existingIndex];
    }
    if ((NSInteger)existingIndex < index) {
      index -= 1;
    }
  }

  NSInteger safeIndex = MAX(0, MIN(index, (NSInteger)_itemViews.count));
  [_itemViews insertObject:childComponentView atIndex:(NSUInteger)safeIndex];
  NSNumber *heightToInsert = (existingIndex != NSNotFound) ? existingHeight : @0;
  if (safeIndex <= _itemHeights.count) {
    [_itemHeights insertObject:heightToInsert atIndex:(NSUInteger)safeIndex];
  } else {
    [_itemHeights addObject:heightToInsert];
  }

  if (_hasPendingNativeDelete || _isAnimatingNativeDelete) {
    return;
  }
  [self reloadTableView];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView
                            index:(NSInteger)index
{
  (void)index;
  BOOL matchesPendingDeleteView =
      _hasPendingNativeDelete && (_pendingNativeDeleteView == childComponentView);
  if (matchesPendingDeleteView) {
    if (childComponentView.superview) {
      [childComponentView removeFromSuperview];
    }
    [self clearPendingNativeDelete];
    return;
  }

  if (_hasPendingNativeDelete || _isAnimatingNativeDelete) {
    if (childComponentView.superview) {
      [childComponentView removeFromSuperview];
    }
    return;
  }

  if (childComponentView.superview) {
    [childComponentView removeFromSuperview];
  }

  NSUInteger resolvedIndex = [_itemViews indexOfObjectIdenticalTo:childComponentView];
  if (resolvedIndex == NSNotFound) {
    return;
  }

  [_itemViews removeObjectAtIndex:resolvedIndex];
  if (resolvedIndex < _itemHeights.count) {
    [_itemHeights removeObjectAtIndex:resolvedIndex];
  }

  if (!_isAnimatingNativeDelete) {
    [self reloadTableView];
  }
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &oldViewProps = *std::static_pointer_cast<EditableListViewProps const>(_props);
  const auto &newViewProps = *std::static_pointer_cast<EditableListViewProps const>(props);
  BOOL didUpdateSearch = NO;
  if (oldViewProps.searchEnabled != newViewProps.searchEnabled) {
    _searchEnabled = newViewProps.searchEnabled;
    didUpdateSearch = YES;
  }
  NSString *nextSearchPlaceholder =
      newViewProps.searchPlaceholder.empty()
          ? @"Search"
          : [NSString stringWithUTF8String:newViewProps.searchPlaceholder.c_str()];
  if (![_searchPlaceholder isEqualToString:nextSearchPlaceholder]) {
    _searchPlaceholder = nextSearchPlaceholder;
    didUpdateSearch = YES;
  }
  if (didUpdateSearch) {
    dispatch_async(dispatch_get_main_queue(), ^{
      [self applySearchConfiguration];
    });
  }
  if (_hasPendingNativeDelete && newViewProps.itemCount >= oldViewProps.itemCount) {
    [self clearPendingNativeDelete];
  }
  BOOL didUpdate = NO;
  if (oldViewProps.itemCount != newViewProps.itemCount) {
    NSUInteger targetCount = newViewProps.itemCount < 0 ? 0 : (NSUInteger)newViewProps.itemCount;
    [self resizeItemHeightsForCount:targetCount];
    didUpdate = YES;
  }
  if (!newViewProps.itemHeights.empty()) {
    NSMutableArray<NSNumber *> *nextHeights = [_itemHeights mutableCopy] ?: [NSMutableArray new];
    BOOL didUpdateHeights = NO;
    NSUInteger index = 0;
    for (const auto height : newViewProps.itemHeights) {
      if (height > 0.0) {
        while (nextHeights.count <= index) {
          [nextHeights addObject:@0];
        }
        if (nextHeights[index].doubleValue != height) {
          nextHeights[index] = @(height);
          didUpdateHeights = YES;
        }
      }
      index++;
    }
    if (didUpdateHeights) {
      _itemHeights = nextHeights;
      didUpdate = YES;
    }
  }
  if (!newViewProps.rowItemIndices.empty()) {
    NSMutableArray<NSNumber *> *nextRowIndices = [NSMutableArray new];
    for (const auto indexValue : newViewProps.rowItemIndices) {
      [nextRowIndices addObject:@(indexValue)];
    }
    if (![_rowItemIndices isEqualToArray:nextRowIndices]) {
      _rowItemIndices = nextRowIndices;
      didUpdate = YES;
    }
  } else {
    if (_rowItemIndices != nil) {
      _rowItemIndices = nil;
      didUpdate = YES;
    }
  }
  const auto &swipeActions = newViewProps.swipeActions;
  if (!swipeActions.leading.empty()) {
    _leadingSwipeActions = EditableListSwipeActionArrayFromVector(swipeActions.leading);
  } else {
    _leadingSwipeActions = nil;
  }
  if (!swipeActions.trailing.empty()) {
    _trailingSwipeActions = EditableListSwipeActionArrayFromVector(swipeActions.trailing);
  } else {
    _trailingSwipeActions = nil;
  }
  if (didUpdate && !_isAnimatingNativeDelete) {
    [self reloadTableView];
  }

  [super updateProps:props oldProps:oldProps];
}

#pragma mark - UITableViewDataSource

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section
{
  return _itemViews.count;
}

- (UITableViewCell *)tableView:(UITableView *)tableView
         cellForRowAtIndexPath:(NSIndexPath *)indexPath
{
  UITableViewCell *cell =
      [tableView dequeueReusableCellWithIdentifier:@"EditableListCell"
                                      forIndexPath:indexPath];
  if (indexPath.row >= _itemViews.count) {
    for (UIView *subview in cell.contentView.subviews) {
      [subview removeFromSuperview];
    }
    cell.selectionStyle = UITableViewCellSelectionStyleNone;
    return cell;
  }
  UIView *itemView = _itemViews[indexPath.row];
  CGFloat width = CGRectGetWidth(tableView.bounds);
  CGFloat height = [self rowHeightForIndex:indexPath.row
                                itemView:itemView
                               tableView:tableView];

  for (UIView *subview in cell.contentView.subviews) {
    [subview removeFromSuperview];
  }

  [itemView removeFromSuperview];
  itemView.translatesAutoresizingMaskIntoConstraints = YES;
  itemView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
  [cell.contentView addSubview:itemView];
  itemView.frame = CGRectMake(0, 0, width, MAX(1.0, height));
  [itemView setNeedsLayout];
  [itemView layoutIfNeeded];

  cell.selectionStyle = UITableViewCellSelectionStyleNone;
  cell.backgroundColor = UIColor.clearColor;
  cell.contentView.backgroundColor = UIColor.clearColor;
  cell.contentView.clipsToBounds = YES;
  return cell;
}

#pragma mark - UITableViewDelegate

- (BOOL)tableView:(UITableView *)tableView canEditRowAtIndexPath:(NSIndexPath *)indexPath
{
  if (indexPath.row >= _itemViews.count) {
    return NO;
  }
  NSInteger itemIndex = [self itemIndexForRow:indexPath.row];
  if (itemIndex < 0) {
    return NO;
  }
  return (_leadingSwipeActions.count > 0 || _trailingSwipeActions.count > 0);
}

- (CGFloat)tableView:(UITableView *)tableView
    heightForRowAtIndexPath:(NSIndexPath *)indexPath
{
  if (indexPath.row >= _itemViews.count) {
    return tableView.estimatedRowHeight > 0.0 ? tableView.estimatedRowHeight : 1.0;
  }
  UIView *itemView = _itemViews[indexPath.row];
  CGFloat height = [self rowHeightForIndex:indexPath.row
                                itemView:itemView
                               tableView:tableView];

  return height;
}

- (UISwipeActionsConfiguration *)tableView:(UITableView *)tableView
leadingSwipeActionsConfigurationForRowAtIndexPath:(NSIndexPath *)indexPath
{
  return [self swipeActionsConfigurationForRow:indexPath.row isLeading:YES];
}

- (UISwipeActionsConfiguration *)tableView:(UITableView *)tableView
trailingSwipeActionsConfigurationForRowAtIndexPath:(NSIndexPath *)indexPath
{
  return [self swipeActionsConfigurationForRow:indexPath.row isLeading:NO];
}

- (NSInteger)itemIndexForRow:(NSInteger)row
{
  if (_rowItemIndices && row < _rowItemIndices.count) {
    return _rowItemIndices[row].integerValue;
  }
  return row;
}

- (UISwipeActionsConfiguration *)swipeActionsConfigurationForRow:(NSInteger)row
                                                       isLeading:(BOOL)isLeading
{
  NSArray<EditableListSwipeAction *> *actions =
      isLeading ? _leadingSwipeActions : _trailingSwipeActions;
  if (actions.count == 0) {
    return nil;
  }

  NSInteger itemIndex = [self itemIndexForRow:row];
  if (itemIndex < 0) {
    return nil;
  }

  NSArray<EditableListSwipeAction *> *orderedActions = actions;
  BOOL allowsFullSwipeDelete = NO;
  if (!isLeading) {
    NSInteger deleteActionIndex = NSNotFound;
    for (NSInteger index = 0; index < actions.count; index++) {
      if (EditableListShouldAnimateDeleteAction(actions[(NSUInteger)index])) {
        deleteActionIndex = index;
        break;
      }
    }
    if (deleteActionIndex != NSNotFound) {
      allowsFullSwipeDelete = YES;
      if (deleteActionIndex != 0) {
        NSMutableArray<EditableListSwipeAction *> *mutableActions = [actions mutableCopy];
        EditableListSwipeAction *deleteAction = mutableActions[(NSUInteger)deleteActionIndex];
        [mutableActions removeObjectAtIndex:(NSUInteger)deleteActionIndex];
        [mutableActions insertObject:deleteAction atIndex:0];
        orderedActions = mutableActions;
      }
    }
  }

  NSMutableArray<UIContextualAction *> *contextualActions = [NSMutableArray new];
  EditableListViewEventEmitter::OnSwipeActionSide side =
      isLeading ? EditableListViewEventEmitter::OnSwipeActionSide::Leading
                : EditableListViewEventEmitter::OnSwipeActionSide::Trailing;
  for (EditableListSwipeAction *action in orderedActions) {
    UIContextualActionStyle style =
        action.destructive ? UIContextualActionStyleDestructive : UIContextualActionStyleNormal;
    UIColor *backgroundColor = EditableListResolvedActionBackgroundColor(action);
    UIColor *foregroundColor = EditableListForegroundColorForBackground(backgroundColor);
    BOOL shouldUseCombinedIconTitleImage = NO;
    if (action.icon && action.title.length > 0) {
      if (@available(iOS 26.0, *)) {
        shouldUseCombinedIconTitleImage = NO;
      } else {
        shouldUseCombinedIconTitleImage = YES;
      }
    }
    NSString *contextualTitle = shouldUseCombinedIconTitleImage ? nil : action.title;
    UIContextualAction *contextualAction =
        [UIContextualAction contextualActionWithStyle:style
                                                title:contextualTitle
                                              handler:^(
                                                  UIContextualAction * _Nonnull actionObj,
                                                  UIView * _Nonnull sourceView,
                                                  void (^ _Nonnull completionHandler)(BOOL)) {
        if (EditableListShouldAnimateDeleteAction(action)) {
          UIView *pendingDeleteView = nil;
          if (row >= 0 && row < _itemViews.count) {
            pendingDeleteView = _itemViews[row];
          }
          [self markPendingNativeDeleteForView:pendingDeleteView];
          BOOL didAnimateDelete = NO;
          if (pendingDeleteView) {
            NSUInteger pendingRow = [_itemViews indexOfObjectIdenticalTo:pendingDeleteView];
            if (pendingRow != NSNotFound) {
              didAnimateDelete = [self animateNativeDeleteForRow:(NSInteger)pendingRow
                                                       completion:^{
                [self emitSwipeActionWithKey:action.key
                                    rowIndex:row
                                   itemIndex:itemIndex
                                        side:side];
              }];
            }
          }
          if (didAnimateDelete) {
            // Keep swipe state active until native delete animation removes the row.
            completionHandler(NO);
          } else {
            completionHandler(YES);
            [self emitSwipeActionWithKey:action.key
                                rowIndex:row
                               itemIndex:itemIndex
                                    side:side];
          }
          return;
        }
        [self emitSwipeActionWithKey:action.key
                            rowIndex:row
                           itemIndex:itemIndex
                                side:side];
        completionHandler(YES);
      }];
    if (action.icon) {
      if (@available(iOS 13.0, *)) {
        UIImageSymbolConfiguration *symbolConfiguration =
            [UIImageSymbolConfiguration configurationWithWeight:UIImageSymbolWeightSemibold];
        UIImage *symbolImage = [UIImage systemImageNamed:action.icon
                                           withConfiguration:symbolConfiguration];
        if (symbolImage) {
          UIImage *tintedSymbolImage =
              [symbolImage imageWithTintColor:foregroundColor
                                renderingMode:UIImageRenderingModeAlwaysOriginal];
          if (shouldUseCombinedIconTitleImage) {
            UIImage *combinedImage =
                EditableListCombinedIconTitleImage(tintedSymbolImage, action.title, foregroundColor);
            contextualAction.image = combinedImage ?: tintedSymbolImage;
          } else {
            contextualAction.image = tintedSymbolImage;
          }
        }
      }
    }
    contextualAction.backgroundColor = backgroundColor;
    [contextualActions addObject:contextualAction];
  }

  UISwipeActionsConfiguration *configuration =
      [UISwipeActionsConfiguration configurationWithActions:contextualActions];
  configuration.performsFirstActionWithFullSwipe = allowsFullSwipeDelete;
  return configuration;
}

#pragma mark - UISearchBarDelegate

- (void)searchBar:(UISearchBar *)searchBar textDidChange:(NSString *)searchText
{
  [self emitSearchChangeWithQuery:searchText ?: @""];
}

- (void)searchBarSearchButtonClicked:(UISearchBar *)searchBar
{
  [searchBar resignFirstResponder];
}

- (void)searchBarCancelButtonClicked:(UISearchBar *)searchBar
{
  searchBar.text = @"";
  [self emitSearchChangeWithQuery:@""];
  [searchBar resignFirstResponder];
}

- (void)emitSwipeActionWithKey:(NSString *)key
                      rowIndex:(NSInteger)rowIndex
                     itemIndex:(NSInteger)itemIndex
                          side:(EditableListViewEventEmitter::OnSwipeActionSide)side
{
  if (!_eventEmitter) {
    return;
  }

  auto eventEmitter =
      std::static_pointer_cast<const EditableListViewEventEmitter>(_eventEmitter);
  if (!eventEmitter) {
    return;
  }

  EditableListViewEventEmitter::OnSwipeAction event = {
      .actionKey = std::string([key UTF8String]),
      .index = static_cast<int>(itemIndex),
      .row = static_cast<int>(rowIndex),
      .side = side,
  };
  eventEmitter->onSwipeAction(event);
}

- (void)emitSearchChangeWithQuery:(NSString *)query
{
  if (!_eventEmitter) {
    return;
  }

  auto eventEmitter =
      std::static_pointer_cast<const EditableListViewEventEmitter>(_eventEmitter);
  if (!eventEmitter) {
    return;
  }

  NSString *safeQuery = query ?: @"";
  EditableListViewEventEmitter::OnSearchChange event = {
      .query = std::string([safeQuery UTF8String]),
  };
  eventEmitter->onSearchChange(event);
}

- (CGFloat)tableView:(UITableView *)tableView
estimatedHeightForRowAtIndexPath:(NSIndexPath *)indexPath
{
  if (indexPath.row < _itemHeights.count) {
    CGFloat height = _itemHeights[indexPath.row].doubleValue;
    if (height > 0.0) {
      return height;
    }
  }
  return tableView.estimatedRowHeight;
}

- (CGFloat)rowHeightForIndex:(NSInteger)index
                    itemView:(UIView *)itemView
                   tableView:(UITableView *)tableView
{
  CGFloat height = 0.0;
  if (index < _itemHeights.count) {
    height = _itemHeights[index].doubleValue;
  }
  if (height <= 0.0) {
    height = CGRectGetHeight(itemView.bounds);
  }
  if (height <= 0.0) {
    height = tableView.estimatedRowHeight > 0.0 ? tableView.estimatedRowHeight : 1.0;
  }

  return height;
}

@end
