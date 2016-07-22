# semanticolor

Provide semantic coloring for Atom. Define what is colorized. Every variable, function, class name, constant has a consistent color across all of your source.

* Be as diverse as you want. Define how diverse your color scheme is with 8-360 colors used.
* LESS Styles compiled from your base syntax colors for good consistent contrast against BG!
* Customize the entities that is colorized

For JavaScript syntax to work properly you will need the language-javascript-semantic package since Atom does not properly parse JavaScript on it's own.

Some features and ideas were taken from that package and applied globally, not just to JavaScript.

# Notes

The settings supply the ability to configure the saturation levels that are used to generate the colors. If you are having contrast issues, or want to minimize/widen the range of colors used, you can manipulate these values. Sadly I do not have a decent way to describe the best way to go about getting your colors right without playing with the values... The relevant code used for generating the colors is below.

```less
.color-indices(@colorDiversity);

.color-indices(@n, @i: 1) when (@i =< @n) {
  @hue: @i * (360 / @n);
  &.semanticolor-@{i} {
    // Choose a color of the given hue with good contrast
    color: contrast(@syntax-background-color,
      hsl(@hue, @saturationLevelA1, @saturationLevelA2),
      hsl(@hue, @saturationLevelB1, @saturationLevelB1)) !important;
  }
  .color-indices(@n, @i + 1);
}
```

![A screenshot of semanticolor](https://raw.githubusercontent.com/xcezzz/semanticolor/master/screenshot.png)
