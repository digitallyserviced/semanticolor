(function() {
  var ColorlexiaView;

  module.exports = ColorlexiaView = (function() {
    function ColorlexiaView(serializedState) {
      var message;
      this.element = document.createElement('div');
      this.element.classList.add('colorlexia');
      message = document.createElement('div');
      message.textContent = "The Colorlexia package is Alive! It's ALIVE!";
      message.classList.add('message');
      this.element.appendChild(message);
    }

    ColorlexiaView.prototype.serialize = function() {};

    ColorlexiaView.prototype.destroy = function() {
      return this.element.remove();
    };

    ColorlexiaView.prototype.getElement = function() {
      return this.element;
    };

    return ColorlexiaView;

  })();

}).call(this);
