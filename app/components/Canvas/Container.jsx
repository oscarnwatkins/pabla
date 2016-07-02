import React from 'react';

import ReactUpdates from 'react/lib/ReactUpdates';
import ReactMultiChild from 'react/lib/ReactMultiChild';
import ReactInstanceMap from 'react/lib/ReactInstanceMap';

import {renderCanvasLayout} from 'utils/canvas';
import debounce from 'utils/debounce';

const Container = Object.assign({}, ReactMultiChild.Mixin, {
  mountAndInjectChildren(children, tx, ct) {
    const mounted = this.mountChildren(children, tx, ct);
    window.requestAnimationFrame(this._draw);
  },

  updateChildren(children, tx, ct) {
    this.mountAndInjectChildren(children, tx, ct);
  }
});

export default React.createClass({
  mixins: [Container],

  render() {
    const {width, height} = this.props;
    const {onMouseDown, onMouseMove, onMouseUp} = this.props
    const style = { width, height };
    const scale = window.devicePixelRatio || 1;
    return <canvas ref="canvas" width={width*scale} height={height*scale} style={style} {...{onMouseDown, onMouseMove, onMouseUp}} />
  },

  scaleCanvas() {
    this.refs.canvas.getContext('2d').scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  },

  componentWillMount() {
    this.passRendered = debounce(this._passRendered, 500);
  },

  componentDidMount() {
    this._debugID = this._reactInternalInstance._debugID;

    const tx = ReactUpdates.ReactReconcileTransaction.getPooled();
    tx.perform(this.mountAndInjectChildren, this, this.props.children, tx, ReactInstanceMap.get(this)._context);
    ReactUpdates.ReactReconcileTransaction.release(tx);

    this.scaleCanvas();
  },

  componentDidUpdate(oldProps) {
    // TODO: update children instead
    const tx = ReactUpdates.ReactReconcileTransaction.getPooled();
    tx.perform(this.updateChildren, this, this.props.children, tx, ReactInstanceMap.get(this)._context);
    ReactUpdates.ReactReconcileTransaction.release(tx);

    if (oldProps.height !== this.props.height || oldProps.width !== this.props.width) {
      this.scaleCanvas();
    }
  },

  _draw() {
    const layoutChildren = Object.keys(this._renderedChildren).map(key => {
      const child = this._renderedChildren[key];
      const node = child.getNativeNode();
      return node;
    });

    const layout = {
      frame: [0, 0, this.props.width, this.props.height],
      children: layoutChildren
    };

    const canvas = this.refs.canvas;
    const ctx = canvas.getContext('2d');
    const {width, height} = this.props;
    ctx.clearRect(0, 0, width, height);

    renderCanvasLayout(ctx, layout);

    this.passRendered();
  },

  _passRendered() {
    const cb = this.props.onRedraw;
    const canvas = this.refs.canvas;
    if (!cb || !canvas) return;

    const data = canvas.toDataURL('image/jpeg');
    cb(data);
  }
});
