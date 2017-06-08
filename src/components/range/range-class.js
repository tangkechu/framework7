import $ from 'dom7';
import Utils from '../../utils/utils';
import Framework7Class from '../../utils/class';

class Range extends Framework7Class {
  constructor(app, params) {
    super(params);
    const range = this;
    const defaults = {
      dual: false,
      step: 1,
      label: true,
    };
    range.params = Utils.extend(defaults, params);

    const el = range.params.el;
    if (!el) return range;

    const $el = $(el);
    if ($el.length === 0) return range;

    let $inputEl;
    if (typeof params.dual === 'undefined') {
      if (range.params.inputEl) {
        $inputEl = $(range.params.inputEl);
      } else if ($el.find('input[type="range"]').length) {
        $inputEl = $el.find('input[type="range"]').eq(0);
      }
    }
    if (typeof params.label === 'undefined' && $el.attr('data-label') === 'true') {
      range.params.label = true;
    }

    Utils.extend(range, range.params, {
      $el,
      el: $el[0],
      $inputEl,
      inputEl: $inputEl ? $inputEl[0] : undefined,
    });

    if ($inputEl) {
      ('step min max value').split(' ').forEach((paramName) => {
        if (!params[paramName] && $inputEl.attr(paramName)) {
          range[paramName] = parseFloat($inputEl.attr(paramName));
        }
      });
    }

    // Dual
    if (range.dual) {
      $el.addClass('range-slider-dual');
    }
    if (range.label) {
      $el.addClass('range-slider-label');
    }

    // Check for layout
    const $barEl = $('<div class="range-bar"></div>');
    const $barActiveEl = $('<div class="range-bar-active"></div>');
    $barEl.append($barActiveEl);

    // Create Knobs
    const knobHTML = `
      <div class="range-knob-wrap">
        <div class="range-knob"></div>
        ${range.label ? '<div class="range-knob-label"></div>' : ''}
      </div>
    `;
    const knobs = [$(knobHTML)];
    const labels = [];

    if (range.dual) {
      knobs.push($(knobHTML));
    }

    $el.append($barEl);
    knobs.forEach(($knobEl) => {
      $el.append($knobEl);
    });

    // Labels
    if (range.label) {
      labels.push(knobs[0].find('.range-knob-label'));
      if (range.dual) {
        labels.push(knobs[1].find('.range-knob-label'));
      }
    }

    Utils.extend(range, {
      knobs,
      labels,
      $barEl,
      $barActiveEl,
    });

    range.$el[0].f7Range = range;

    // Touch Events
    let isTouched;
    const touchesStart = {};
    let isScrolling;
    let rangeOffsetLeft;
    let $dualKnobEl;
    let dualValueIndex;
    function handleTouchStart(e) {
      if (isTouched) return;
      touchesStart.x = e.type === 'touchstart' ? e.targetTouches[0].pageX : e.pageX;
      touchesStart.y = e.type === 'touchstart' ? e.targetTouches[0].pageY : e.pageY;

      isTouched = true;
      isScrolling = undefined;
      rangeOffsetLeft = range.$el.offset().left;

      const progress = (touchesStart.x - rangeOffsetLeft) / range.rangeWidth;

      let newValue = (progress * (range.max - range.min)) + range.min;
      if (range.dual) {
        if (Math.abs(range.value[0] - newValue) < Math.abs(range.value[1] - newValue)) {
          dualValueIndex = 0;
          $dualKnobEl = range.knobs[0];
          newValue = [newValue, range.value[1]];
        } else {
          dualValueIndex = 1;
          $dualKnobEl = range.knobs[1];
          newValue = [range.value[0], newValue];
        }
        $dualKnobEl.addClass('range-knob-active');
      } else {
        newValue = (progress * (range.max - range.min)) + range.min;
        range.knobs[0].addClass('range-knob-active');
      }
      range.setValue(newValue);
    }
    function handleTouchMove(e) {
      if (!isTouched) return;
      const pageX = e.type === 'touchmove' ? e.targetTouches[0].pageX : e.pageX;
      const pageY = e.type === 'touchmove' ? e.targetTouches[0].pageY : e.pageY;

      if (typeof isScrolling === 'undefined') {
        isScrolling = !!(isScrolling || Math.abs(pageY - touchesStart.y) > Math.abs(pageX - touchesStart.x));
      }
      if (isScrolling) {
        isTouched = false;
        return;
      }
      e.preventDefault();

      const progress = (pageX - rangeOffsetLeft) / range.rangeWidth;
      let newValue = (progress * (range.max - range.min)) + range.min;
      if (range.dual) {
        let leftValue;
        let rightValue;
        if (dualValueIndex === 0) {
          leftValue = newValue;
          rightValue = range.value[1];
          if (leftValue > rightValue) {
            rightValue = leftValue;
          }
        } else {
          leftValue = range.value[0];
          rightValue = newValue;
          if (rightValue < leftValue) {
            leftValue = rightValue;
          }
        }
        newValue = [leftValue, rightValue];
      } else {
        newValue = (progress * (range.max - range.min)) + range.min;
      }
      range.setValue(newValue);
    }
    function handleTouchEnd() {
      if (!isTouched) {
        isTouched = false;
        return;
      }
      isTouched = false;
      if (!range.dual) {
        range.knobs[0].removeClass('range-knob-active');
      } else if ($dualKnobEl) {
        $dualKnobEl.removeClass('range-knob-active');
      }
    }

    range.handleResize = function handleResize() {
      range.calcSize();
      range.layout();
    };
    range.attachEvents = function attachEvents() {
      range.$el.on(app.touchEvents.start, handleTouchStart, { passive: false });
      $(document).on(app.touchEvents.move, handleTouchMove, { passive: false });
      $(document).on(app.touchEvents.end, handleTouchEnd, { passive: false });
      app.on('resize', range.handleResize);
    };
    range.detachEvents = function detachEvents() {
      range.$el.off(app.touchEvents.start, handleTouchStart, { passive: false });
      $(document).off(app.touchEvents.move, handleTouchMove, { passive: false });
      $(document).off(app.touchEvents.end, handleTouchEnd, { passive: false });
      app.off('resize', range.handleResize);
    };

    // Init
    range.init();

    return range;
  }
  calcSize() {
    const range = this;
    range.rangeWidth = range.$el.outerWidth();
    range.knobWidth = range.knobs[0].outerWidth();
  }
  layout() {
    const range = this;
    const { knobWidth, rangeWidth, min, max, knobs, $barActiveEl, value, label, labels } = range;
    if (range.dual) {
      const progress = [((value[0] - min) / (max - min)), ((value[1] - min) / (max - min))];
      $barActiveEl.css({
        left: `${progress[0] * 100}%`,
        width: `${(progress[1] - progress[0]) * 100}%`,
      });
      knobs.forEach(($knobEl, knobIndex) => {
        let leftPos = rangeWidth * progress[knobIndex];
        const realLeft = (rangeWidth * progress[knobIndex]) - (knobWidth / 2);
        if (realLeft < 0) leftPos = knobWidth / 2;
        if ((realLeft + knobWidth) > rangeWidth) leftPos = rangeWidth - (knobWidth / 2);
        $knobEl.css('left', `${leftPos}px`);
        if (label) labels[knobIndex].text(value[knobIndex]);
      });
    } else {
      const progress = ((value - min) / (max - min));
      $barActiveEl.css('width', `${progress * 100}%`);

      let leftPos = rangeWidth * progress;
      const realLeft = (rangeWidth * progress) - (knobWidth / 2);
      if (realLeft < 0) leftPos = knobWidth / 2;
      if ((realLeft + knobWidth) > rangeWidth) leftPos = rangeWidth - (knobWidth / 2);
      knobs[0].css('left', `${leftPos}px`);
      if (label) labels[0].text(value);
    }
    if ((range.dual && value.indexOf(min) >= 0) || (!range.dual && value === min)) {
      range.$el.addClass('range-slider-min');
    } else {
      range.$el.removeClass('range-slider-min');
    }
    if ((range.dual && value.indexOf(max) >= 0) || (!range.dual && value === max)) {
      range.$el.addClass('range-slider-max');
    } else {
      range.$el.removeClass('range-slider-max');
    }
  }
  setValue(newValue) {
    const range = this;
    const { step, min, max } = range;
    if (range.dual) {
      let newValues = newValue;
      if (newValue[0] > newValue[1]) {
        newValues = [newValues[0], newValues[0]];
      }
      newValues = newValues.map((value) => {
        return Math.max(Math.min(Math.round(value / step) * step, max), min);
      });
      if (newValues[0] === range.value[0] && newValues[1] === range.value[1]) {
        return range;
      }
      newValues.forEach((value, valueIndex) => {
        range.value[valueIndex] = value;
      });
      range.layout();
    } else {
      const value = Math.max(Math.min(Math.round(newValue / step) * step, max), min);
      range.value = value;
      range.layout();
    }
    // Events
    range.$el.trigger('change rangeChange range:change', range, range.value);
    if (range.$inputEl && !range.dual) {
      range.$inputEl.val(range.value).trigger('input change');
    }
    range.emit('change rangeChange range:change', range.value);
    return range;
  }
  getValue() {
    return this.value;
  }
  init() {
    const range = this;
    range.calcSize();
    range.layout();
    range.attachEvents();
    return range;
  }
  destroy() {
    const range = this;
    range.detachEvents();
  }
}

export default Range;
