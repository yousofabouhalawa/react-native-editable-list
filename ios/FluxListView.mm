#import "FluxListView.h"

#import <math.h>
#import <QuartzCore/QuartzCore.h>
#import <React/RCTConversions.h>
#import <react/renderer/components/FluxListViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/FluxListViewSpec/EventEmitters.h>
#import <react/renderer/components/FluxListViewSpec/Props.h>
#import <react/renderer/components/FluxListViewSpec/RCTComponentViewHelpers.h>

#import "RCTFabricComponentsPlugins.h"

using namespace facebook::react;

@interface FluxListSwipeAction : NSObject
@property (nonatomic, copy) NSString *key;
@property (nonatomic, copy) NSString *title;
@property (nonatomic, strong, nullable) UIColor *color;
@property (nonatomic, copy, nullable) NSString *icon;
@property (nonatomic, assign) BOOL destructive;
@end

@implementation FluxListSwipeAction
@end

@interface FluxListSelectionIndicatorView : UIView
- (void)setSelected:(BOOL)selected tintColor:(UIColor *)tintColor animated:(BOOL)animated;
@end

@implementation FluxListSelectionIndicatorView {
  CAShapeLayer *_outlineLayer;
  CAShapeLayer *_fillLayer;
  CAShapeLayer *_checkLayer;
  BOOL _selected;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    self.backgroundColor = UIColor.clearColor;
    self.userInteractionEnabled = NO;

    _outlineLayer = [CAShapeLayer layer];
    _outlineLayer.fillColor = UIColor.clearColor.CGColor;
    _outlineLayer.strokeColor = [UIColor tertiaryLabelColor].CGColor;
    _outlineLayer.lineWidth = 2.0;
    [self.layer addSublayer:_outlineLayer];

    _fillLayer = [CAShapeLayer layer];
    _fillLayer.opacity = 0.0;
    [self.layer addSublayer:_fillLayer];

    _checkLayer = [CAShapeLayer layer];
    _checkLayer.fillColor = UIColor.clearColor.CGColor;
    _checkLayer.strokeColor = UIColor.whiteColor.CGColor;
    _checkLayer.lineCap = kCALineCapRound;
    _checkLayer.lineJoin = kCALineJoinRound;
    _checkLayer.lineWidth = 2.4;
    _checkLayer.strokeEnd = 0.0;
    [self.layer addSublayer:_checkLayer];
  }
  return self;
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  CGRect bounds = self.bounds;
  CGFloat inset = 2.0;
  CGRect circleRect = CGRectInset(bounds, inset, inset);
  UIBezierPath *circlePath = [UIBezierPath bezierPathWithOvalInRect:circleRect];
  _outlineLayer.frame = bounds;
  _outlineLayer.path = circlePath.CGPath;
  _fillLayer.frame = bounds;
  _fillLayer.path = circlePath.CGPath;

  CGFloat width = CGRectGetWidth(bounds);
  CGFloat height = CGRectGetHeight(bounds);
  UIBezierPath *checkPath = [UIBezierPath bezierPath];
  [checkPath moveToPoint:CGPointMake(width * 0.29, height * 0.52)];
  [checkPath addLineToPoint:CGPointMake(width * 0.44, height * 0.67)];
  [checkPath addLineToPoint:CGPointMake(width * 0.72, height * 0.36)];
  _checkLayer.frame = bounds;
  _checkLayer.path = checkPath.CGPath;
}

- (void)setSelected:(BOOL)selected tintColor:(UIColor *)tintColor animated:(BOOL)animated
{
  UIColor *resolvedTintColor = tintColor ?: UIColor.systemBlueColor;
  _fillLayer.fillColor = resolvedTintColor.CGColor;
  _outlineLayer.strokeColor =
      selected ? resolvedTintColor.CGColor : [UIColor tertiaryLabelColor].CGColor;

  if (_selected == selected && _fillLayer.opacity == (selected ? 1.0 : 0.0)) {
    return;
  }
  _selected = selected;

  CGFloat targetOpacity = selected ? 1.0 : 0.0;
  CGFloat targetStrokeEnd = selected ? 1.0 : 0.0;
  CGFloat targetScale = selected ? 1.0 : 0.72;

  if (!animated) {
    _fillLayer.opacity = targetOpacity;
    _checkLayer.strokeEnd = targetStrokeEnd;
    _fillLayer.transform = CATransform3DMakeScale(targetScale, targetScale, 1.0);
    _checkLayer.opacity = selected ? 1.0 : 0.0;
    return;
  }

  [CATransaction begin];
  [CATransaction setAnimationDuration:0.18];
  [CATransaction setAnimationTimingFunction:
                     [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseOut]];
  _fillLayer.opacity = targetOpacity;
  _fillLayer.transform = CATransform3DMakeScale(targetScale, targetScale, 1.0);
  [CATransaction commit];

  CABasicAnimation *checkAnimation = [CABasicAnimation animationWithKeyPath:@"strokeEnd"];
  checkAnimation.fromValue = selected ? @0.0 : @1.0;
  checkAnimation.toValue = @(targetStrokeEnd);
  checkAnimation.duration = selected ? 0.22 : 0.12;
  checkAnimation.timingFunction =
      [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseOut];
  _checkLayer.strokeEnd = targetStrokeEnd;
  _checkLayer.opacity = selected ? 1.0 : 0.0;
  [_checkLayer addAnimation:checkAnimation forKey:@"FluxListCheckmark"];
}

@end

@interface FluxListCell : UITableViewCell
@property (nonatomic, strong, readonly) UIView *hostView;
@property (nonatomic, weak, nullable) UIView *mountedItemView;
@property (nonatomic, assign) CGFloat preferredHeight;
- (void)mountItemView:(UIView *_Nullable)itemView;
- (void)setSelectionEditing:(BOOL)editing
                  selected:(BOOL)selected
                 tintColor:(UIColor *)tintColor
                  animated:(BOOL)animated;
- (void)preserveCurrentSnapshot;
- (void)preserveSnapshotForItemView:(UIView *)itemView;
- (void)releasePreservedSnapshotAnimated:(BOOL)animated;
@end

@implementation FluxListCell {
  UIView *_preservedSnapshotView;
  FluxListSelectionIndicatorView *_selectionIndicatorView;
  BOOL _selectionEditing;
  BOOL _selectionSelected;
  UIColor *_selectionTintColor;
}

- (void)clearPreservedSnapshot
{
  [_preservedSnapshotView removeFromSuperview];
  _preservedSnapshotView = nil;
}

- (instancetype)initWithStyle:(UITableViewCellStyle)style reuseIdentifier:(NSString *)reuseIdentifier
{
  if (self = [super initWithStyle:style reuseIdentifier:reuseIdentifier]) {
    _hostView = [[UIView alloc] initWithFrame:CGRectZero];
    _hostView.backgroundColor = UIColor.clearColor;
    _hostView.clipsToBounds = YES;
    _selectionIndicatorView = [[FluxListSelectionIndicatorView alloc] initWithFrame:CGRectZero];
    _selectionIndicatorView.alpha = 0.0;
    _selectionIndicatorView.hidden = YES;
    _selectionTintColor = UIColor.systemBlueColor;
    self.selectionStyle = UITableViewCellSelectionStyleNone;
    self.backgroundColor = UIColor.systemBackgroundColor;
    self.contentView.backgroundColor = UIColor.systemBackgroundColor;
    self.clipsToBounds = YES;
    self.contentView.clipsToBounds = YES;
    [self.contentView addSubview:_hostView];
    [self.contentView addSubview:_selectionIndicatorView];
  }
  return self;
}

- (void)prepareForReuse
{
  [super prepareForReuse];
  // Cells are intentionally stable per row. Do not unmount React content here.
}

- (void)mountItemView:(UIView *)itemView
{
  if (_mountedItemView == itemView && itemView.superview == _hostView) {
    [self setNeedsLayout];
    return;
  }

  for (UIView *subview in _hostView.subviews) {
    if (subview != itemView) {
      [subview removeFromSuperview];
    }
  }

  _mountedItemView = itemView;
  if (!itemView) {
    return;
  }

  if (itemView.superview != _hostView) {
    [itemView removeFromSuperview];
    [_hostView addSubview:itemView];
  }
  itemView.hidden = NO;
  itemView.translatesAutoresizingMaskIntoConstraints = YES;
  itemView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
  [self setNeedsLayout];
}

- (void)setSelectionEditing:(BOOL)editing
                  selected:(BOOL)selected
                 tintColor:(UIColor *)tintColor
                  animated:(BOOL)animated
{
  BOOL didChangeEditing = _selectionEditing != editing;
  BOOL didChangeSelected = _selectionSelected != selected;
  if (didChangeEditing && animated) {
    [self layoutIfNeeded];
  }

  _selectionEditing = editing;
  _selectionSelected = selected;
  _selectionTintColor = tintColor ?: UIColor.systemBlueColor;

  [_selectionIndicatorView setSelected:selected
                             tintColor:_selectionTintColor
                              animated:animated && editing && didChangeSelected];

  if (didChangeEditing) {
    _selectionIndicatorView.hidden = NO;
    [UIView performWithoutAnimation:^{
      [self setNeedsLayout];
      [self layoutIfNeeded];
    }];
    [UIView animateWithDuration:animated ? 0.22 : 0.0
                          delay:0.0
                        options:UIViewAnimationOptionBeginFromCurrentState |
                                UIViewAnimationOptionAllowUserInteraction |
                                UIViewAnimationOptionCurveEaseInOut
                     animations:^{
      self->_selectionIndicatorView.alpha = editing ? 1.0 : 0.0;
    } completion:^(__unused BOOL finished) {
      self->_selectionIndicatorView.hidden = !editing;
    }];
  } else {
    [self setNeedsLayout];
  }
}

- (void)preserveCurrentSnapshot
{
  UIView *itemView = _mountedItemView;
  if (itemView) {
    [self preserveSnapshotForItemView:itemView];
  }
}

- (void)preserveSnapshotForItemView:(UIView *)itemView
{
  if (!itemView || itemView.superview != _hostView || CGRectIsEmpty(itemView.bounds)) {
    return;
  }

  UIView *snapshotView = [itemView snapshotViewAfterScreenUpdates:NO];
  if (!snapshotView) {
    snapshotView =
        [itemView resizableSnapshotViewFromRect:itemView.bounds
                             afterScreenUpdates:NO
                                  withCapInsets:UIEdgeInsetsZero];
  }
  if (!snapshotView) {
    return;
  }

  [self clearPreservedSnapshot];
  _preservedSnapshotView = snapshotView;
  _preservedSnapshotView.userInteractionEnabled = NO;
  _preservedSnapshotView.frame = _hostView.frame;
  [self.contentView addSubview:_preservedSnapshotView];
}

- (void)releasePreservedSnapshotAnimated:(BOOL)animated
{
  UIView *snapshotView = _preservedSnapshotView;
  if (!snapshotView) {
    return;
  }

  _preservedSnapshotView = nil;
  if (!animated) {
    [snapshotView removeFromSuperview];
    return;
  }

  [UIView animateWithDuration:0.12
      delay:0.0
      options:UIViewAnimationOptionBeginFromCurrentState | UIViewAnimationOptionAllowUserInteraction
      animations:^{
        snapshotView.alpha = 0.0;
      }
      completion:^(__unused BOOL finished) {
        [snapshotView removeFromSuperview];
      }];
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  CGFloat width = CGRectGetWidth(self.contentView.bounds);
  CGFloat height = _preferredHeight > 0.0 ? _preferredHeight : CGRectGetHeight(self.contentView.bounds);
  CGFloat indicatorSize = 24.0;
  CGFloat indicatorLeft = 16.0;
  CGFloat hostLeft = _selectionEditing ? 52.0 : 0.0;
  _selectionIndicatorView.frame =
      CGRectMake(indicatorLeft, floor((height - indicatorSize) * 0.5), indicatorSize, indicatorSize);
  _hostView.frame = CGRectMake(hostLeft, 0.0, MAX(1.0, width), MAX(1.0, height));
  _mountedItemView.frame = _hostView.bounds;
  _preservedSnapshotView.frame = _hostView.frame;
  [_mountedItemView setNeedsLayout];
}

@end

static UIColor *FluxListDefaultActionBackgroundColor(BOOL destructive)
{
  return destructive ? UIColor.systemRedColor : UIColor.systemBlueColor;
}

static UIColor *FluxListResolvedActionBackgroundColor(FluxListSwipeAction *action)
{
  UIColor *fallbackColor = FluxListDefaultActionBackgroundColor(action.destructive);
  UIColor *backgroundColor = action.color ?: fallbackColor;
  CGFloat alpha = CGColorGetAlpha(backgroundColor.CGColor);
  if (alpha <= 0.01) {
    return fallbackColor;
  }
  return backgroundColor;
}

static UIColor *FluxListForegroundColorForBackground(UIColor *backgroundColor)
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

static UIImage * _Nullable FluxListCombinedIconTitleImage(
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

static BOOL FluxListIsDeleteAction(FluxListSwipeAction *action)
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
static NSArray<FluxListSwipeAction *> *FluxListSwipeActionArrayFromVector(
    const ActionVector &actions)
{
  NSMutableArray<FluxListSwipeAction *> *result = [NSMutableArray new];
  for (const auto &action : actions) {
    FluxListSwipeAction *item = [FluxListSwipeAction new];
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

static NSArray<NSString *> *FluxListItemKeysFromSignature(const std::string &signature)
{
  if (signature.empty()) {
    return @[];
  }

  NSString *signatureString = [NSString stringWithUTF8String:signature.c_str()];
  NSRange firstSeparator = [signatureString rangeOfString:@":"];
  if (firstSeparator.location == NSNotFound) {
    return @[];
  }
  NSRange remainingRange =
      NSMakeRange(NSMaxRange(firstSeparator), signatureString.length - NSMaxRange(firstSeparator));
  NSRange secondSeparator = [signatureString rangeOfString:@":" options:0 range:remainingRange];
  if (secondSeparator.location == NSNotFound) {
    return @[];
  }

  NSString *keysString = [signatureString substringFromIndex:NSMaxRange(secondSeparator)];
  if (keysString.length == 0) {
    return @[];
  }
  return [keysString componentsSeparatedByString:@"|"];
}

static NSArray<NSIndexPath *> *FluxListIndexPathsFromIndexes(NSArray<NSNumber *> *indexes)
{
  NSMutableArray<NSIndexPath *> *indexPaths = [NSMutableArray new];
  for (NSNumber *indexNumber in indexes) {
    NSInteger index = indexNumber.integerValue;
    if (index >= 0) {
      [indexPaths addObject:[NSIndexPath indexPathForRow:index inSection:0]];
    }
  }
  return indexPaths;
}

@implementation FluxListView {
  UIView *_containerView;
  UITableView *_tableView;
  UISearchBar *_searchBar;
  NSMutableArray<UIView *> *_itemViews;
  NSMutableArray<NSNumber *> *_mountedRowIndices;
  NSMutableArray<NSNumber *> *_rowItemIndices;
  NSMutableArray<NSNumber *> *_deferredMountedRowIndicesAfterDelete;
  NSMutableArray<NSNumber *> *_deferredRowItemIndicesAfterDelete;
  NSMutableArray<NSNumber *> *_selectedItemIndices;
  NSMutableDictionary<NSNumber *, UIView *> *_itemViewsByRow;
  NSMutableDictionary<NSNumber *, FluxListCell *> *_cellsByRow;
  NSMutableDictionary<NSNumber *, NSNumber *> *_itemHeightsByRow;
  NSMutableDictionary<NSNumber *, NSNumber *> *_measuredItemHeightsByRow;
  NSMutableDictionary<NSNumber *, NSNumber *> *_deferredItemHeightsByRowAfterDelete;
  NSArray<FluxListSwipeAction *> *_leadingSwipeActions;
  NSArray<FluxListSwipeAction *> *_trailingSwipeActions;
  NSArray<FluxListSwipeAction *> *_contextMenuActions;
  NSInteger _itemCount;
  NSInteger _pendingSwipeDeleteRow;
  NSInteger _pendingDeletedRow;
  __weak UIView *_pendingDeletedItemView;
  BOOL _hasPendingDeletedRow;
  BOOL _isAnimatingNativeDelete;
  BOOL _isAnimatingSmoothTransition;
  BOOL _reloadScheduled;
  BOOL _editing;
  BOOL _allowsMultipleSelectionDuringEditing;
  BOOL _isApplyingSelectedItemIndices;
  BOOL _smoothTransitions;
  BOOL _searchEnabled;
  CGFloat _estimatedItemHeight;
  CGFloat _fixedItemHeight;
  NSInteger _lastEmittedVisibleFirst;
  NSInteger _lastEmittedVisibleLast;
  UIColor *_selectionTintColor;
  NSString *_searchPlaceholder;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<FluxListViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const FluxListViewProps>();
    _props = defaultProps;

    _containerView = [[UIView alloc] initWithFrame:CGRectZero];
    _tableView = [[UITableView alloc] initWithFrame:CGRectZero style:UITableViewStylePlain];
    _itemViews = [NSMutableArray new];
    _mountedRowIndices = [NSMutableArray new];
    _rowItemIndices = [NSMutableArray new];
    _deferredMountedRowIndicesAfterDelete = nil;
    _deferredRowItemIndicesAfterDelete = nil;
    _selectedItemIndices = [NSMutableArray new];
    _itemViewsByRow = [NSMutableDictionary new];
    _cellsByRow = [NSMutableDictionary new];
    _itemHeightsByRow = [NSMutableDictionary new];
    _measuredItemHeightsByRow = [NSMutableDictionary new];
    _deferredItemHeightsByRowAfterDelete = nil;
    _itemCount = 0;
    _pendingSwipeDeleteRow = NSNotFound;
    _pendingDeletedRow = NSNotFound;
    _pendingDeletedItemView = nil;
    _hasPendingDeletedRow = NO;
    _estimatedItemHeight = 72.0;
    _fixedItemHeight = 0.0;
    _lastEmittedVisibleFirst = NSNotFound;
    _lastEmittedVisibleLast = NSNotFound;
    _allowsMultipleSelectionDuringEditing = YES;
    _smoothTransitions = NO;
    _selectionTintColor = UIColor.systemBlueColor;
    _searchPlaceholder = @"Search";

    _tableView.dataSource = self;
    _tableView.delegate = self;
    _tableView.separatorStyle = UITableViewCellSeparatorStyleNone;
    _tableView.backgroundColor = UIColor.systemBackgroundColor;
    _tableView.estimatedRowHeight = _estimatedItemHeight;
    _tableView.rowHeight = UITableViewAutomaticDimension;
    _tableView.allowsMultipleSelectionDuringEditing = _allowsMultipleSelectionDuringEditing;
    _tableView.clipsToBounds = YES;
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
  [self layoutMountedCells];
  [self emitVisibleRangeIfNeeded];
}

- (void)reloadTableView
{
  if (_isAnimatingNativeDelete || _isAnimatingSmoothTransition) {
    return;
  }
  if (_reloadScheduled) {
    return;
  }
  _reloadScheduled = YES;
  dispatch_async(dispatch_get_main_queue(), ^{
    _reloadScheduled = NO;
    if (_isAnimatingNativeDelete || _isAnimatingSmoothTransition) {
      return;
    }
    [_tableView reloadData];
    [self layoutMountedCells];
    [self applySelectedItemIndices];
    [self emitVisibleRangeIfNeeded];
  });
}

- (NSInteger)tableRowForMountedViewIndex:(NSUInteger)index
{
  NSInteger row = (NSInteger)index;
  if (index < _mountedRowIndices.count) {
    row = _mountedRowIndices[index].integerValue;
  }

  if (_hasPendingDeletedRow) {
    if (row == _pendingDeletedRow) {
      return NSNotFound;
    }
    if (row > _pendingDeletedRow) {
      row -= 1;
    }
  }

  return row;
}

- (void)rebuildMountedItemViewMap
{
  [_itemViewsByRow removeAllObjects];
  for (NSUInteger index = 0; index < _itemViews.count; index++) {
    NSInteger row = [self tableRowForMountedViewIndex:index];
    if (row >= 0 && row < _itemCount) {
      _itemViewsByRow[@(row)] = _itemViews[index];
    }
  }
}

- (UIView *)mountedItemViewForRow:(NSInteger)row
{
  return _itemViewsByRow[@(row)];
}

- (NSInteger)itemIndexForRow:(NSInteger)row
{
  if (_rowItemIndices && _rowItemIndices.count > row) {
    NSInteger itemIndex = _rowItemIndices[row].integerValue;
    if (_hasPendingDeletedRow && itemIndex > _pendingDeletedRow) {
      itemIndex -= 1;
    }
    return itemIndex;
  }
  return row;
}

- (FluxListCell *)stableCellForRow:(NSInteger)row
{
  NSNumber *rowNumber = @(row);
  FluxListCell *cell = _cellsByRow[rowNumber];
  if (!cell) {
    cell = [[FluxListCell alloc] initWithStyle:UITableViewCellStyleDefault
                               reuseIdentifier:nil];
    _cellsByRow[rowNumber] = cell;
  }
  return cell;
}

- (void)updateMeasuredHeightForRow:(NSInteger)row itemView:(UIView *)itemView
{
  if (_fixedItemHeight > 0.0 || !itemView) {
    return;
  }

  CGFloat measuredHeight = CGRectGetHeight(itemView.bounds);
  if (measuredHeight <= 0.0) {
    measuredHeight =
        [itemView systemLayoutSizeFittingSize:UILayoutFittingCompressedSize].height;
  }
  if (measuredHeight <= 0.0) {
    return;
  }

  NSNumber *currentHeight = _measuredItemHeightsByRow[@(row)];
  if (currentHeight && fabs(currentHeight.doubleValue - measuredHeight) <= 0.5) {
    return;
  }

  _measuredItemHeightsByRow[@(row)] = @(measuredHeight);
  if (!_isAnimatingNativeDelete && _tableView.window) {
    [_tableView beginUpdates];
    [_tableView endUpdates];
  }
}

- (void)mountItemViewForRow:(NSInteger)row
                   intoCell:(FluxListCell *)cell
                   animated:(BOOL)animated
{
  UIView *itemView = [self mountedItemViewForRow:row];
  CGFloat height = [self rowHeightForIndex:row itemView:itemView tableView:_tableView];
  cell.preferredHeight = height;
  [cell mountItemView:itemView];
  NSInteger itemIndex = [self itemIndexForRow:row];
  BOOL selected = itemIndex >= 0 && [self selectedItemIndicesContainItemIndex:itemIndex];
  [cell setSelectionEditing:_editing
                  selected:selected
                 tintColor:_selectionTintColor
                  animated:animated];
  [cell setNeedsLayout];
  if (!animated) {
    [cell layoutIfNeeded];
  }
  [self updateMeasuredHeightForRow:row itemView:itemView];
}

- (void)updateSelectionChromeForRow:(NSInteger)row animated:(BOOL)animated
{
  FluxListCell *cell = _cellsByRow[@(row)];
  if (!cell) {
    UITableViewCell *visibleCell =
        [_tableView cellForRowAtIndexPath:[NSIndexPath indexPathForRow:row inSection:0]];
    if ([visibleCell isKindOfClass:FluxListCell.class]) {
      cell = (FluxListCell *)visibleCell;
    }
  }
  if (!cell) {
    return;
  }

  NSInteger itemIndex = [self itemIndexForRow:row];
  BOOL selected = itemIndex >= 0 && [self selectedItemIndicesContainItemIndex:itemIndex];
  [cell setSelectionEditing:_editing
                  selected:selected
                 tintColor:_selectionTintColor
                  animated:animated];
}

- (void)layoutMountedCells
{
  [self layoutMountedCellsAnimated:NO];
}

- (void)layoutMountedCellsAnimated:(BOOL)animated
{
  for (NSNumber *rowNumber in _cellsByRow.allKeys) {
    NSInteger row = rowNumber.integerValue;
    FluxListCell *cell = _cellsByRow[rowNumber];
    if (row < 0 || row >= _itemCount) {
      [cell mountItemView:nil];
      continue;
    }
    [self mountItemViewForRow:row intoCell:cell animated:animated];
  }
}

- (void)rebuildVisibleCellMap
{
  NSMutableDictionary<NSNumber *, FluxListCell *> *nextCellsByRow = [NSMutableDictionary new];
  for (NSIndexPath *indexPath in _tableView.indexPathsForVisibleRows ?: @[]) {
    UITableViewCell *visibleCell = [_tableView cellForRowAtIndexPath:indexPath];
    if ([visibleCell isKindOfClass:FluxListCell.class]) {
      nextCellsByRow[@(indexPath.row)] = (FluxListCell *)visibleCell;
    }
  }
  _cellsByRow = nextCellsByRow;
}

- (void)preserveVisibleSnapshotsAfterRow:(NSInteger)deletedRow
{
  for (NSIndexPath *indexPath in _tableView.indexPathsForVisibleRows) {
    if (indexPath.row <= deletedRow) {
      continue;
    }
    FluxListCell *cell = _cellsByRow[@(indexPath.row)];
    if (!cell) {
      UITableViewCell *visibleCell = [_tableView cellForRowAtIndexPath:indexPath];
      if ([visibleCell isKindOfClass:FluxListCell.class]) {
        cell = (FluxListCell *)visibleCell;
      }
    }
    [cell preserveCurrentSnapshot];
  }
}

- (void)preserveVisibleSnapshots
{
  for (NSIndexPath *indexPath in _tableView.indexPathsForVisibleRows) {
    FluxListCell *cell = _cellsByRow[@(indexPath.row)];
    if (!cell) {
      UITableViewCell *visibleCell = [_tableView cellForRowAtIndexPath:indexPath];
      if ([visibleCell isKindOfClass:FluxListCell.class]) {
        cell = (FluxListCell *)visibleCell;
      }
    }
    [cell preserveCurrentSnapshot];
  }
}

- (void)releasePreservedSnapshotsAnimated:(BOOL)animated
{
  for (FluxListCell *cell in _cellsByRow.allValues) {
    [cell releasePreservedSnapshotAnimated:animated];
  }
}

- (void)schedulePreservedSnapshotRelease
{
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.20 * NSEC_PER_SEC)),
                 dispatch_get_main_queue(), ^{
    [self releasePreservedSnapshotsAnimated:YES];
  });
}

- (FluxListCell *)cellHostingItemView:(UIView *)itemView
{
  if (!itemView) {
    return nil;
  }

  for (NSNumber *rowNumber in _cellsByRow.allKeys) {
    FluxListCell *cell = _cellsByRow[rowNumber];
    if (cell.mountedItemView == itemView || itemView.superview == cell.hostView) {
      return cell;
    }
  }
  return nil;
}

- (void)reindexCachedRowsAfterDeletingRow:(NSInteger)deletedRow
{
  NSMutableDictionary<NSNumber *, FluxListCell *> *nextCellsByRow = [NSMutableDictionary new];
  for (NSNumber *rowNumber in _cellsByRow.allKeys) {
    NSInteger row = rowNumber.integerValue;
    if (row == deletedRow) {
      [_cellsByRow[rowNumber] mountItemView:nil];
      continue;
    }

    NSInteger nextRow = row > deletedRow ? row - 1 : row;
    if (nextRow >= 0 && nextRow < _itemCount) {
      nextCellsByRow[@(nextRow)] = _cellsByRow[rowNumber];
    }
  }
  _cellsByRow = nextCellsByRow;

  NSMutableDictionary<NSNumber *, NSNumber *> *nextMeasuredHeightsByRow =
      [NSMutableDictionary new];
  for (NSNumber *rowNumber in _measuredItemHeightsByRow.allKeys) {
    NSInteger row = rowNumber.integerValue;
    if (row == deletedRow) {
      continue;
    }

    NSInteger nextRow = row > deletedRow ? row - 1 : row;
    if (nextRow >= 0 && nextRow < _itemCount) {
      nextMeasuredHeightsByRow[@(nextRow)] = _measuredItemHeightsByRow[rowNumber];
    }
  }
  _measuredItemHeightsByRow = nextMeasuredHeightsByRow;
}

- (void)finishPendingDeleteIfDeletedViewUnmounted
{
  if (!_hasPendingDeletedRow || _isAnimatingNativeDelete) {
    return;
  }

  if (_pendingDeletedItemView &&
      [_itemViews indexOfObjectIdenticalTo:_pendingDeletedItemView] != NSNotFound) {
    [self rebuildMountedItemViewMap];
    [self layoutMountedCells];
    return;
  }

  _hasPendingDeletedRow = NO;
  _pendingDeletedRow = NSNotFound;
  _pendingDeletedItemView = nil;
  if (_deferredMountedRowIndicesAfterDelete) {
    _mountedRowIndices = _deferredMountedRowIndicesAfterDelete;
    _deferredMountedRowIndicesAfterDelete = nil;
  }
  if (_deferredRowItemIndicesAfterDelete) {
    _rowItemIndices = _deferredRowItemIndicesAfterDelete;
    _deferredRowItemIndicesAfterDelete = nil;
  }
  if (_deferredItemHeightsByRowAfterDelete) {
    _itemHeightsByRow = _deferredItemHeightsByRowAfterDelete;
    _deferredItemHeightsByRowAfterDelete = nil;
  }
  [self rebuildMountedItemViewMap];
  [self layoutMountedCells];
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
  } else if (fabs(_tableView.tableHeaderView.frame.size.width - frame.size.width) > 0.5) {
    _tableView.tableHeaderView = searchBar;
  }
}

- (void)applyEditingConfiguration
{
  _tableView.allowsMultipleSelectionDuringEditing = _allowsMultipleSelectionDuringEditing;
  _tableView.allowsMultipleSelection = _editing && _allowsMultipleSelectionDuringEditing;
  if (_tableView.editing) {
    [_tableView setEditing:NO animated:NO];
  }
  if (!_editing) {
    for (NSIndexPath *indexPath in _tableView.indexPathsForSelectedRows ?: @[]) {
      [_tableView deselectRowAtIndexPath:indexPath animated:NO];
    }
  }
  [_cellsByRow removeAllObjects];
  [UIView performWithoutAnimation:^{
    [_tableView reloadData];
    [self layoutMountedCellsAnimated:NO];
  }];
  [self applySelectedItemIndices];
}

- (BOOL)selectedItemIndicesContainItemIndex:(NSInteger)itemIndex
{
  return [_selectedItemIndices containsObject:@(itemIndex)];
}

- (void)applySelectedItemIndices
{
  if (!_editing || _itemCount <= 0) {
    return;
  }

  _isApplyingSelectedItemIndices = YES;
  for (NSInteger row = 0; row < _itemCount; row++) {
    NSInteger itemIndex = [self itemIndexForRow:row];
    if (itemIndex < 0) {
      continue;
    }
    NSIndexPath *indexPath = [NSIndexPath indexPathForRow:row inSection:0];
    if ([self selectedItemIndicesContainItemIndex:itemIndex]) {
      [_tableView selectRowAtIndexPath:indexPath
                              animated:NO
                        scrollPosition:UITableViewScrollPositionNone];
    } else {
      [_tableView deselectRowAtIndexPath:indexPath animated:NO];
    }
    [self updateSelectionChromeForRow:row animated:YES];
  }
  _isApplyingSelectedItemIndices = NO;
}

- (void)clearPendingDeleteIfReactCaughtUpWithItemCount:(NSInteger)nextItemCount
{
  if (!_hasPendingDeletedRow || nextItemCount > _itemCount) {
    return;
  }
  _hasPendingDeletedRow = NO;
  _pendingDeletedRow = NSNotFound;
  _pendingDeletedItemView = nil;
  if (_deferredMountedRowIndicesAfterDelete) {
    _mountedRowIndices = _deferredMountedRowIndicesAfterDelete;
    _deferredMountedRowIndicesAfterDelete = nil;
  }
  if (_deferredRowItemIndicesAfterDelete) {
    _rowItemIndices = _deferredRowItemIndicesAfterDelete;
    _deferredRowItemIndicesAfterDelete = nil;
  }
  if (_deferredItemHeightsByRowAfterDelete) {
    _itemHeightsByRow = _deferredItemHeightsByRowAfterDelete;
    _deferredItemHeightsByRowAfterDelete = nil;
  }
  [self rebuildMountedItemViewMap];
  [self layoutMountedCells];
  [self schedulePreservedSnapshotRelease];
}

- (BOOL)animatePendingDeleteToItemCount:(NSInteger)nextItemCount
{
  if (_isAnimatingNativeDelete ||
      _hasPendingDeletedRow ||
      _pendingSwipeDeleteRow == NSNotFound ||
      _pendingSwipeDeleteRow < 0 ||
      _pendingSwipeDeleteRow >= _itemCount ||
      nextItemCount >= _itemCount ||
      _tableView.numberOfSections == 0 ||
      _pendingSwipeDeleteRow >= [_tableView numberOfRowsInSection:0]) {
    _pendingSwipeDeleteRow = NSNotFound;
    return NO;
  }

  NSInteger row = _pendingSwipeDeleteRow;
  _pendingSwipeDeleteRow = NSNotFound;
  _pendingDeletedItemView = [self mountedItemViewForRow:row];
  _deferredMountedRowIndicesAfterDelete = nil;
  _deferredRowItemIndicesAfterDelete = nil;
  _deferredItemHeightsByRowAfterDelete = nil;
  _hasPendingDeletedRow = YES;
  _pendingDeletedRow = row;
  [self preserveVisibleSnapshotsAfterRow:row];
  _itemCount = MAX(0, nextItemCount);
  [self rebuildMountedItemViewMap];

  NSIndexPath *indexPath = [NSIndexPath indexPathForRow:row inSection:0];
  _isAnimatingNativeDelete = YES;
  @try {
    [_tableView performBatchUpdates:^{
      [_tableView deleteRowsAtIndexPaths:@[ indexPath ]
                        withRowAnimation:UITableViewRowAnimationAutomatic];
    } completion:^(__unused BOOL finished) {
      _isAnimatingNativeDelete = NO;
      [self reindexCachedRowsAfterDeletingRow:row];
      [self finishPendingDeleteIfDeletedViewUnmounted];
      [self layoutMountedCells];
      [self applySelectedItemIndices];
      [self emitVisibleRangeIfNeeded];
      [self schedulePreservedSnapshotRelease];
    }];
  } @catch (NSException *exception) {
    _isAnimatingNativeDelete = NO;
    _hasPendingDeletedRow = NO;
    _pendingDeletedRow = NSNotFound;
    _pendingDeletedItemView = nil;
    _deferredMountedRowIndicesAfterDelete = nil;
    _deferredRowItemIndicesAfterDelete = nil;
    _deferredItemHeightsByRowAfterDelete = nil;
    _itemCount = MAX(0, nextItemCount);
    [self rebuildMountedItemViewMap];
    [self releasePreservedSnapshotsAnimated:NO];
    [self reloadTableView];
    return NO;
  }

  return YES;
}

- (BOOL)animateSmoothTransitionFromKeys:(NSArray<NSString *> *)oldKeys
                                 toKeys:(NSArray<NSString *> *)nextKeys
                              itemCount:(NSInteger)nextItemCount
{
  if (!_smoothTransitions ||
      _isAnimatingNativeDelete ||
      _isAnimatingSmoothTransition ||
      _hasPendingDeletedRow ||
      _tableView.numberOfSections == 0 ||
      !_tableView.window) {
    return NO;
  }

  NSInteger oldItemCount = _itemCount;
  if (nextItemCount == oldItemCount) {
    return NO;
  }

  NSMutableArray<NSNumber *> *deleteIndexes = [NSMutableArray new];
  NSMutableArray<NSNumber *> *insertIndexes = [NSMutableArray new];
  BOOL canUseKeyedDiff = oldKeys.count == oldItemCount && nextKeys.count == nextItemCount;
  if (canUseKeyedDiff) {
    NSSet<NSString *> *nextKeySet = [NSSet setWithArray:nextKeys];
    NSSet<NSString *> *oldKeySet = [NSSet setWithArray:oldKeys];
    [oldKeys enumerateObjectsUsingBlock:^(NSString *key, NSUInteger index, __unused BOOL *stop) {
      if (![nextKeySet containsObject:key]) {
        [deleteIndexes addObject:@(index)];
      }
    }];
    [nextKeys enumerateObjectsUsingBlock:^(NSString *key, NSUInteger index, __unused BOOL *stop) {
      if (![oldKeySet containsObject:key]) {
        [insertIndexes addObject:@(index)];
      }
    }];
  } else if (nextItemCount < oldItemCount) {
    for (NSInteger index = nextItemCount; index < oldItemCount; index++) {
      [deleteIndexes addObject:@(index)];
    }
  } else {
    for (NSInteger index = oldItemCount; index < nextItemCount; index++) {
      [insertIndexes addObject:@(index)];
    }
  }

  if (oldItemCount - (NSInteger)deleteIndexes.count + (NSInteger)insertIndexes.count !=
      nextItemCount) {
    return NO;
  }

  NSArray<NSIndexPath *> *deleteIndexPaths = FluxListIndexPathsFromIndexes(deleteIndexes);
  NSArray<NSIndexPath *> *insertIndexPaths = FluxListIndexPathsFromIndexes(insertIndexes);
  if (deleteIndexPaths.count == 0 && insertIndexPaths.count == 0) {
    return NO;
  }

  [self preserveVisibleSnapshots];
  _isAnimatingSmoothTransition = YES;
  _itemCount = MAX(0, nextItemCount);
  _lastEmittedVisibleFirst = NSNotFound;
  _lastEmittedVisibleLast = NSNotFound;

  @try {
    [_tableView performBatchUpdates:^{
      if (deleteIndexPaths.count > 0) {
        [_tableView deleteRowsAtIndexPaths:deleteIndexPaths
                          withRowAnimation:UITableViewRowAnimationAutomatic];
      }
      if (insertIndexPaths.count > 0) {
        [_tableView insertRowsAtIndexPaths:insertIndexPaths
                          withRowAnimation:UITableViewRowAnimationAutomatic];
      }
    } completion:^(__unused BOOL finished) {
      self->_isAnimatingSmoothTransition = NO;
      [self rebuildMountedItemViewMap];
      [self->_cellsByRow removeAllObjects];
      [self->_measuredItemHeightsByRow removeAllObjects];
      [UIView performWithoutAnimation:^{
        [self->_tableView reloadData];
        [self layoutMountedCells];
      }];
      [self applySelectedItemIndices];
      [self emitVisibleRangeIfNeeded];
      [self schedulePreservedSnapshotRelease];
    }];
  } @catch (NSException *exception) {
    _isAnimatingSmoothTransition = NO;
    _itemCount = MAX(0, nextItemCount);
    [self rebuildMountedItemViewMap];
    [self releasePreservedSnapshotsAnimated:NO];
    [self reloadTableView];
    return NO;
  }

  return YES;
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView
                          index:(NSInteger)index
{
  NSUInteger existingIndex = [_itemViews indexOfObjectIdenticalTo:childComponentView];
  if (existingIndex != NSNotFound) {
    [_itemViews removeObjectAtIndex:existingIndex];
    if ((NSInteger)existingIndex < index) {
      index -= 1;
    }
  }

  NSInteger safeIndex = MAX(0, MIN(index, (NSInteger)_itemViews.count));
  [_itemViews insertObject:childComponentView atIndex:(NSUInteger)safeIndex];
  [self rebuildMountedItemViewMap];
  NSInteger row = [self tableRowForMountedViewIndex:(NSUInteger)safeIndex];
  if (row >= 0 && row < _itemCount) {
    [self mountItemViewForRow:row intoCell:[self stableCellForRow:row] animated:NO];
  }
  if (_fixedItemHeight <= 0.0 && !_isAnimatingNativeDelete && !_hasPendingDeletedRow) {
    [self reloadTableView];
  }
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView
                            index:(NSInteger)index
{
  (void)index;
  BOOL didUnmountPendingDeletedView = _pendingDeletedItemView == childComponentView;
  if ((_isAnimatingNativeDelete || _isAnimatingSmoothTransition || _hasPendingDeletedRow) &&
      !didUnmountPendingDeletedView) {
    FluxListCell *hostingCell = [self cellHostingItemView:childComponentView];
    [hostingCell preserveSnapshotForItemView:childComponentView];
  }

  if (childComponentView.superview) {
    [childComponentView removeFromSuperview];
  }

  NSUInteger resolvedIndex = [_itemViews indexOfObjectIdenticalTo:childComponentView];
  if (resolvedIndex != NSNotFound) {
    [_itemViews removeObjectAtIndex:resolvedIndex];
  }
  [self rebuildMountedItemViewMap];

  if (!_isAnimatingNativeDelete && !_isAnimatingSmoothTransition) {
    if (didUnmountPendingDeletedView) {
      [self finishPendingDeleteIfDeletedViewUnmounted];
    }
    [self layoutMountedCells];
    if (_fixedItemHeight <= 0.0 && !didUnmountPendingDeletedView && !_hasPendingDeletedRow) {
      [self reloadTableView];
    }
  }
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &oldViewProps = *std::static_pointer_cast<FluxListViewProps const>(_props);
  const auto &newViewProps = *std::static_pointer_cast<FluxListViewProps const>(props);

  BOOL didUpdateEditing = NO;
  if (oldViewProps.editing != newViewProps.editing) {
    _editing = newViewProps.editing;
    didUpdateEditing = YES;
  }
  if (oldViewProps.allowsMultipleSelectionDuringEditing !=
      newViewProps.allowsMultipleSelectionDuringEditing) {
    _allowsMultipleSelectionDuringEditing =
        newViewProps.allowsMultipleSelectionDuringEditing;
    didUpdateEditing = YES;
  }
  UIColor *nextSelectionTintColor =
      newViewProps.selectionTintColor
          ? RCTUIColorFromSharedColor(newViewProps.selectionTintColor)
          : UIColor.systemBlueColor;
  if (![_selectionTintColor isEqual:nextSelectionTintColor]) {
    _selectionTintColor = nextSelectionTintColor;
    didUpdateEditing = YES;
  }
  if (oldViewProps.smoothTransitions != newViewProps.smoothTransitions) {
    _smoothTransitions = newViewProps.smoothTransitions;
  }

  NSMutableArray<NSNumber *> *nextSelectedIndices = [NSMutableArray new];
  for (const auto indexValue : newViewProps.selectedItemIndices) {
    [nextSelectedIndices addObject:@(indexValue)];
  }
  if (![_selectedItemIndices isEqualToArray:nextSelectedIndices]) {
    _selectedItemIndices = nextSelectedIndices;
    didUpdateEditing = YES;
  }

  if (didUpdateEditing) {
    dispatch_async(dispatch_get_main_queue(), ^{
      [self applyEditingConfiguration];
    });
  }

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

  NSInteger nextItemCount = newViewProps.itemCount < 0 ? 0 : newViewProps.itemCount;

  BOOL didUpdate = NO;
  BOOL didAnimateDelete = NO;
  BOOL didAnimateTransition = NO;
  if (newViewProps.estimatedItemHeight > 0.0 &&
      fabs(_estimatedItemHeight - newViewProps.estimatedItemHeight) > 0.5) {
    _estimatedItemHeight = newViewProps.estimatedItemHeight;
    if (_fixedItemHeight <= 0.0) {
      _tableView.estimatedRowHeight = _estimatedItemHeight;
    }
    didUpdate = YES;
  }

  NSMutableArray<NSNumber *> *nextMountedRows = [NSMutableArray new];
  for (const auto rowValue : newViewProps.mountedRowIndices) {
    [nextMountedRows addObject:@(rowValue)];
  }

  NSMutableArray<NSNumber *> *nextRowIndices = [NSMutableArray new];
  for (const auto indexValue : newViewProps.rowItemIndices) {
    [nextRowIndices addObject:@(indexValue)];
  }

  NSMutableDictionary<NSNumber *, NSNumber *> *nextItemHeightsByRow = [NSMutableDictionary new];
  NSUInteger heightCount = MIN(newViewProps.itemHeights.size(), nextMountedRows.count);
  for (NSUInteger index = 0; index < heightCount; index++) {
    CGFloat height = newViewProps.itemHeights[index];
    if (height > 0.0) {
      nextItemHeightsByRow[nextMountedRows[index]] = @(height);
    }
  }

  BOOL didPreapplyLayoutMapsForSmoothTransition = NO;
  if (oldViewProps.itemCount != newViewProps.itemCount || _itemCount != nextItemCount) {
    if (nextItemCount < _itemCount && [self animatePendingDeleteToItemCount:nextItemCount]) {
      didUpdate = NO;
      didAnimateDelete = YES;
    } else {
      _mountedRowIndices = nextMountedRows;
      _itemHeightsByRow = nextItemHeightsByRow;
      _rowItemIndices = nextRowIndices;
      [self rebuildMountedItemViewMap];
      didPreapplyLayoutMapsForSmoothTransition = YES;

      if ([self animateSmoothTransitionFromKeys:FluxListItemKeysFromSignature(oldViewProps.itemSignature)
                                         toKeys:FluxListItemKeysFromSignature(newViewProps.itemSignature)
                                      itemCount:nextItemCount]) {
        didUpdate = NO;
        didAnimateTransition = YES;
      } else {
        [self clearPendingDeleteIfReactCaughtUpWithItemCount:nextItemCount];
        _itemCount = nextItemCount;
        _lastEmittedVisibleFirst = NSNotFound;
        _lastEmittedVisibleLast = NSNotFound;
        didUpdate = YES;
      }
    }
  }

  if (![_mountedRowIndices isEqualToArray:nextMountedRows]) {
    if (didAnimateDelete) {
      _deferredMountedRowIndicesAfterDelete = nextMountedRows;
    } else if (!didPreapplyLayoutMapsForSmoothTransition) {
      _mountedRowIndices = nextMountedRows;
      [self rebuildMountedItemViewMap];
      didUpdate = YES;
    }
  }

  CGFloat nextFixedItemHeight = 0.0;
  if (!newViewProps.itemHeights.empty()) {
    CGFloat firstHeight = newViewProps.itemHeights[0];
    BOOL allRowsHaveFixedHeight = firstHeight > 0.0;
    for (const auto heightValue : newViewProps.itemHeights) {
      if (heightValue <= 0.0 || fabs(heightValue - firstHeight) > 0.5) {
        allRowsHaveFixedHeight = NO;
        break;
      }
    }
    if (allRowsHaveFixedHeight) {
      nextFixedItemHeight = firstHeight;
    }
  }
  if (fabs(_fixedItemHeight - nextFixedItemHeight) > 0.5) {
    _fixedItemHeight = nextFixedItemHeight;
    _tableView.rowHeight =
        _fixedItemHeight > 0.0 ? _fixedItemHeight : UITableViewAutomaticDimension;
    _tableView.estimatedRowHeight =
        _fixedItemHeight > 0.0 ? _fixedItemHeight : _estimatedItemHeight;
    didUpdate = YES;
  }

  if (didAnimateDelete) {
    _deferredItemHeightsByRowAfterDelete = nextItemHeightsByRow;
  } else if (!didPreapplyLayoutMapsForSmoothTransition) {
    _itemHeightsByRow = nextItemHeightsByRow;
  }

  if (![_rowItemIndices isEqualToArray:nextRowIndices]) {
    if (didAnimateDelete) {
      _deferredRowItemIndicesAfterDelete = nextRowIndices;
    } else if (!didPreapplyLayoutMapsForSmoothTransition) {
      _rowItemIndices = nextRowIndices;
      didUpdate = YES;
    }
  }

  const auto &swipeActions = newViewProps.swipeActions;
  _leadingSwipeActions =
      swipeActions.leading.empty() ? nil : FluxListSwipeActionArrayFromVector(swipeActions.leading);
  _trailingSwipeActions =
      swipeActions.trailing.empty() ? nil : FluxListSwipeActionArrayFromVector(swipeActions.trailing);
  _contextMenuActions =
      newViewProps.contextMenuActions.empty()
          ? nil
          : FluxListSwipeActionArrayFromVector(newViewProps.contextMenuActions);

  if (didUpdate && !didAnimateDelete && !didAnimateTransition) {
    [self rebuildMountedItemViewMap];
    [self reloadTableView];
  }

  [super updateProps:props oldProps:oldProps];
}

#pragma mark - UITableViewDataSource

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section
{
  (void)tableView;
  (void)section;
  return _itemCount;
}

- (UITableViewCell *)tableView:(UITableView *)tableView
         cellForRowAtIndexPath:(NSIndexPath *)indexPath
{
  (void)tableView;
  FluxListCell *cell = [self stableCellForRow:indexPath.row];
  [self mountItemViewForRow:indexPath.row intoCell:cell animated:NO];
  return cell;
}

#pragma mark - UITableViewDelegate

- (BOOL)tableView:(UITableView *)tableView canEditRowAtIndexPath:(NSIndexPath *)indexPath
{
  (void)tableView;
  if (indexPath.row >= _itemCount) {
    return NO;
  }
  if (_editing) {
    return NO;
  }
  return (_leadingSwipeActions.count > 0 || _trailingSwipeActions.count > 0);
}

- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath
{
  if (!_editing) {
    [tableView deselectRowAtIndexPath:indexPath animated:YES];
    return;
  }

  NSInteger itemIndex = [self itemIndexForRow:indexPath.row];
  if (itemIndex < 0) {
    return;
  }

  NSNumber *itemNumber = @(itemIndex);
  if (![_selectedItemIndices containsObject:itemNumber]) {
    [_selectedItemIndices addObject:itemNumber];
  }
  [self updateSelectionChromeForRow:indexPath.row animated:YES];
  [self emitSelectionChange];
}

- (void)tableView:(UITableView *)tableView didDeselectRowAtIndexPath:(NSIndexPath *)indexPath
{
  (void)tableView;
  if (!_editing || _isApplyingSelectedItemIndices) {
    return;
  }

  NSInteger itemIndex = [self itemIndexForRow:indexPath.row];
  if (itemIndex < 0) {
    return;
  }

  [_selectedItemIndices removeObject:@(itemIndex)];
  [self updateSelectionChromeForRow:indexPath.row animated:YES];
  [self emitSelectionChange];
}

- (CGFloat)tableView:(UITableView *)tableView
    heightForRowAtIndexPath:(NSIndexPath *)indexPath
{
  if (indexPath.row >= _itemCount) {
    return tableView.estimatedRowHeight > 0.0 ? tableView.estimatedRowHeight : 1.0;
  }
  UIView *itemView = [self mountedItemViewForRow:indexPath.row];
  return [self rowHeightForIndex:indexPath.row itemView:itemView tableView:tableView];
}

- (CGFloat)tableView:(UITableView *)tableView
estimatedHeightForRowAtIndexPath:(NSIndexPath *)indexPath
{
  if (_fixedItemHeight > 0.0) {
    return _fixedItemHeight;
  }
  NSNumber *heightNumber = _itemHeightsByRow[@(indexPath.row)];
  if (heightNumber && heightNumber.doubleValue > 0.0) {
    return heightNumber.doubleValue;
  }
  return _estimatedItemHeight > 0.0 ? _estimatedItemHeight : tableView.estimatedRowHeight;
}

- (UISwipeActionsConfiguration *)tableView:(UITableView *)tableView
leadingSwipeActionsConfigurationForRowAtIndexPath:(NSIndexPath *)indexPath
{
  (void)tableView;
  return [self swipeActionsConfigurationForRow:indexPath.row isLeading:YES];
}

- (UISwipeActionsConfiguration *)tableView:(UITableView *)tableView
trailingSwipeActionsConfigurationForRowAtIndexPath:(NSIndexPath *)indexPath
{
  (void)tableView;
  return [self swipeActionsConfigurationForRow:indexPath.row isLeading:NO];
}

- (UIContextMenuConfiguration *)tableView:(UITableView *)tableView
    contextMenuConfigurationForRowAtIndexPath:(NSIndexPath *)indexPath
                                       point:(CGPoint)point
API_AVAILABLE(ios(13.0))
{
  (void)tableView;
  (void)point;
  if (_editing || _contextMenuActions.count == 0 || indexPath.row >= _itemCount) {
    return nil;
  }

  NSInteger itemIndex = [self itemIndexForRow:indexPath.row];
  if (itemIndex < 0) {
    return nil;
  }

  __weak FluxListView *weakSelf = self;
  NSArray<FluxListSwipeAction *> *actions = _contextMenuActions;
  NSInteger row = indexPath.row;
  return [UIContextMenuConfiguration
      configurationWithIdentifier:nil
                  previewProvider:nil
                   actionProvider:^UIMenu * _Nullable(
                       NSArray<UIMenuElement *> * _Nonnull suggestedActions) {
    (void)suggestedActions;
    NSMutableArray<UIMenuElement *> *menuActions = [NSMutableArray new];
    for (FluxListSwipeAction *action in actions) {
      UIImage *image = action.icon.length > 0 ? [UIImage systemImageNamed:action.icon] : nil;
      UIAction *menuAction =
          [UIAction actionWithTitle:action.title
                              image:image
                         identifier:nil
                            handler:^(__kindof UIAction * _Nonnull selectedAction) {
        (void)selectedAction;
        [weakSelf emitContextMenuActionWithKey:action.key
                                      rowIndex:row
                                     itemIndex:itemIndex];
      }];
      if (action.destructive) {
        menuAction.attributes = UIMenuElementAttributesDestructive;
      }
      [menuActions addObject:menuAction];
    }
    return [UIMenu menuWithTitle:@"" children:menuActions];
  }];
}

- (void)scrollViewDidScroll:(UIScrollView *)scrollView
{
  (void)scrollView;
  [self layoutMountedCells];
  [self emitVisibleRangeIfNeeded];
}

- (void)tableView:(UITableView *)tableView
didEndDisplayingCell:(UITableViewCell *)cell
forRowAtIndexPath:(NSIndexPath *)indexPath
{
  (void)tableView;
  NSNumber *rowNumber = @(indexPath.row);
  if (_cellsByRow[rowNumber] == cell) {
    [_cellsByRow removeObjectForKey:rowNumber];
  }
}

- (UISwipeActionsConfiguration *)swipeActionsConfigurationForRow:(NSInteger)row
                                                       isLeading:(BOOL)isLeading
{
  NSArray<FluxListSwipeAction *> *actions =
      isLeading ? _leadingSwipeActions : _trailingSwipeActions;
  if (actions.count == 0 || row < 0 || row >= _itemCount) {
    return nil;
  }

  NSInteger itemIndex = [self itemIndexForRow:row];
  if (itemIndex < 0) {
    return nil;
  }

  NSArray<FluxListSwipeAction *> *orderedActions = actions;
  BOOL allowsFullSwipeFirstAction = actions.count > 0;
  if (!isLeading) {
    NSInteger deleteActionIndex = NSNotFound;
    for (NSInteger index = 0; index < actions.count; index++) {
      if (FluxListIsDeleteAction(actions[(NSUInteger)index])) {
        deleteActionIndex = index;
        break;
      }
    }
    if (deleteActionIndex != NSNotFound && deleteActionIndex != 0) {
      NSMutableArray<FluxListSwipeAction *> *mutableActions = [actions mutableCopy];
      FluxListSwipeAction *deleteAction = mutableActions[(NSUInteger)deleteActionIndex];
      [mutableActions removeObjectAtIndex:(NSUInteger)deleteActionIndex];
      [mutableActions insertObject:deleteAction atIndex:0];
      orderedActions = mutableActions;
    }
  }

  FluxListViewEventEmitter::OnSwipeActionSide side =
      isLeading ? FluxListViewEventEmitter::OnSwipeActionSide::Leading
                : FluxListViewEventEmitter::OnSwipeActionSide::Trailing;
  NSMutableArray<UIContextualAction *> *contextualActions = [NSMutableArray new];
  for (FluxListSwipeAction *action in orderedActions) {
    UIContextualActionStyle style =
        action.destructive ? UIContextualActionStyleDestructive : UIContextualActionStyleNormal;
    UIColor *backgroundColor = FluxListResolvedActionBackgroundColor(action);
    UIColor *foregroundColor = FluxListForegroundColorForBackground(backgroundColor);
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
      (void)actionObj;
      (void)sourceView;
      if (FluxListIsDeleteAction(action)) {
        _pendingSwipeDeleteRow = row;
        [self emitSwipeActionWithKey:action.key rowIndex:row itemIndex:itemIndex side:side];
        completionHandler(YES);
        return;
      }

      [self emitSwipeActionWithKey:action.key rowIndex:row itemIndex:itemIndex side:side];
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
                FluxListCombinedIconTitleImage(tintedSymbolImage, action.title, foregroundColor);
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
  configuration.performsFirstActionWithFullSwipe = allowsFullSwipeFirstAction;
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

#pragma mark - Events

- (void)emitSelectionChange
{
  if (!_eventEmitter || _isApplyingSelectedItemIndices) {
    return;
  }

  auto eventEmitter =
      std::static_pointer_cast<const FluxListViewEventEmitter>(_eventEmitter);
  if (!eventEmitter) {
    return;
  }

  NSArray<NSNumber *> *sortedSelection =
      [_selectedItemIndices sortedArrayUsingSelector:@selector(compare:)];
  std::vector<int> selectedIndices;
  selectedIndices.reserve(sortedSelection.count);
  for (NSNumber *itemIndex in sortedSelection) {
    selectedIndices.push_back(itemIndex.intValue);
  }

  FluxListViewEventEmitter::OnSelectionChange event = {
      .selectedIndices = selectedIndices,
  };
  eventEmitter->onSelectionChange(event);
}

- (void)emitSwipeActionWithKey:(NSString *)key
                      rowIndex:(NSInteger)rowIndex
                     itemIndex:(NSInteger)itemIndex
                          side:(FluxListViewEventEmitter::OnSwipeActionSide)side
{
  if (!_eventEmitter) {
    return;
  }

  auto eventEmitter =
      std::static_pointer_cast<const FluxListViewEventEmitter>(_eventEmitter);
  if (!eventEmitter) {
    return;
  }

  FluxListViewEventEmitter::OnSwipeAction event = {
      .actionKey = std::string([key UTF8String]),
      .index = static_cast<int>(itemIndex),
      .row = static_cast<int>(rowIndex),
      .side = side,
  };
  eventEmitter->onSwipeAction(event);
}

- (void)emitContextMenuActionWithKey:(NSString *)key
                            rowIndex:(NSInteger)rowIndex
                           itemIndex:(NSInteger)itemIndex
{
  if (!_eventEmitter) {
    return;
  }

  auto eventEmitter =
      std::static_pointer_cast<const FluxListViewEventEmitter>(_eventEmitter);
  if (!eventEmitter) {
    return;
  }

  FluxListViewEventEmitter::OnContextMenuAction event = {
      .actionKey = std::string([key UTF8String]),
      .index = static_cast<int>(itemIndex),
      .row = static_cast<int>(rowIndex),
  };
  eventEmitter->onContextMenuAction(event);
}

- (void)emitSearchChangeWithQuery:(NSString *)query
{
  if (!_eventEmitter) {
    return;
  }

  auto eventEmitter =
      std::static_pointer_cast<const FluxListViewEventEmitter>(_eventEmitter);
  if (!eventEmitter) {
    return;
  }

  NSString *safeQuery = query ?: @"";
  FluxListViewEventEmitter::OnSearchChange event = {
      .query = std::string([safeQuery UTF8String]),
  };
  eventEmitter->onSearchChange(event);
}

- (void)emitVisibleRangeIfNeeded
{
  if (!_eventEmitter || _itemCount <= 0) {
    return;
  }

  NSArray<NSIndexPath *> *visibleRows = _tableView.indexPathsForVisibleRows;
  NSInteger first = NSNotFound;
  NSInteger last = NSNotFound;
  for (NSIndexPath *indexPath in visibleRows) {
    NSInteger row = indexPath.row;
    if (row < 0 || row >= _itemCount) {
      continue;
    }
    if (first == NSNotFound || row < first) {
      first = row;
    }
    if (last == NSNotFound || row > last) {
      last = row;
    }
  }

  if (first == NSNotFound || last == NSNotFound) {
    CGFloat rowHeight = _estimatedItemHeight > 0.0 ? _estimatedItemHeight : 72.0;
    first = MAX(0, (NSInteger)floor(_tableView.contentOffset.y / rowHeight));
    NSInteger visibleCount =
        MAX(1, (NSInteger)ceil(CGRectGetHeight(_tableView.bounds) / rowHeight) + 1);
    last = MIN(_itemCount - 1, first + visibleCount - 1);
  }

  if (first == _lastEmittedVisibleFirst && last == _lastEmittedVisibleLast) {
    return;
  }
  _lastEmittedVisibleFirst = first;
  _lastEmittedVisibleLast = last;

  auto eventEmitter =
      std::static_pointer_cast<const FluxListViewEventEmitter>(_eventEmitter);
  if (!eventEmitter) {
    return;
  }

  FluxListViewEventEmitter::OnVisibleRangeChange event = {
      .first = static_cast<int>(first),
      .last = static_cast<int>(last),
  };
  eventEmitter->onVisibleRangeChange(event);
}

- (CGFloat)rowHeightForIndex:(NSInteger)index
                    itemView:(UIView *)itemView
                   tableView:(UITableView *)tableView
{
  if (_fixedItemHeight > 0.0) {
    return _fixedItemHeight;
  }

  CGFloat height = 0.0;
  NSNumber *heightNumber = _itemHeightsByRow[@(index)];
  if (heightNumber) {
    height = heightNumber.doubleValue;
  }
  NSNumber *measuredHeightNumber = _measuredItemHeightsByRow[@(index)];
  if (height <= 0.0 && measuredHeightNumber) {
    height = measuredHeightNumber.doubleValue;
  }
  if (height <= 0.0 && itemView) {
    height = CGRectGetHeight(itemView.bounds);
  }
  if (height <= 0.0) {
    height = _estimatedItemHeight > 0.0 ? _estimatedItemHeight : tableView.estimatedRowHeight;
  }
  if (height <= 0.0) {
    height = 1.0;
  }
  return height;
}

@end
