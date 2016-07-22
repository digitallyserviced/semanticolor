(function() {
  module.exports = (function() {
    function SemanticolorView(serializedState) {
      var message;
      this.element = document.createElement('div');
      this.element.classList.add('semanticolor');
      message = document.createElement('div');
      message.textContent =
        "The Semanticolor Color Diversity Has Changed! Reload must occur for update. Proceed?";
      message.classList.add('message');
      message.style.padding = "10px;"
      message.style.textAlign = "center";
      var button = document.createElement('button');
      button.textContent = "Reload";

      button.classList.add('btn');
      button.classList.add('icon');
      button.classList.add('icon-versions');
      button.classList.add('reload');
      button.style.margin = "10px auto";
      button.style.width = "100%";

      button.onclick = function() {
        var colorDiversity = atom.config.get('semanticolor').colorDiversity;
        atom.notifications.addSuccess('Reloading...', {
          detail: 'Updating stylesheet with {' + colorDiversity +
            '} possible colors.'
        });
        setTimeout(function() {
          atom.reload();
        }, 2000);
      };

      this.element.appendChild(message);
      this.element.appendChild(button);
    }

    SemanticolorView.prototype.serialize = function() {};

    SemanticolorView.prototype.destroy = function() {
      return this.element.remove();
    };

    SemanticolorView.prototype.getElement = function() {
      return this.element;
    };

    return SemanticolorView;
  })();
}).call(this);
