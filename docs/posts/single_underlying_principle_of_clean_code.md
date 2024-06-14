---
draft: False
date: 2024-05-31
slug: single-underlying-principle-of-clean-code
authors:
  - viktorbubanja
---
# The Single Underlying Principle of Clean Code

I didn't realise how many different opinions there were on what constitues clean code until I recently asked a series interview candidates *"What do you consider to be clean code?"*. Each response was unique and often enlightening, and made me curious to reflect on my own definition.

Typically, when learning about clean code, we're presented with a checklist of principles to follow or pitfalls to avoid. Occasionally, we delve into fundamental concepts like "readability," though often without understanding their significance.

I'd like to share my perspective on what I believe is the core principle underlying all other clean code principles, particularly in Agile development, and illustrate this with a few examples.
<!-- more -->

# Essence of Clean Code

The essence of clean code is: *code that is easy to change*.

In Agile, we iterate quickly and must be able to respond rapidly to changing business requirements. We need to update our code often, and *quickly*, and so for Agile to be viable our code must be easy to change. Clean code is therefore a pillar (or requirement) of Agile.

We can see this underlying principle in all of the higher-level principles of clean code, as well as code smells, if we question them, for example:

**DRY (Don’t repeat yourself)**

Starting with the simplest one: why is duplicating code considered unclean? Because updating duplicated code requires changes in more than one place – making it harder to change.

**Automated tests**

Why are tests considered a necessary component of clean code? Tests ensure our code functions as expected and (hopefully) alert us if we make a breaking change. This means we can make changes while remaining confident that the code still works – i.e. making the code easier to change. Going a step further: good tests are decoupled from the implementation of our code. Why? Because this means we are free to change the implementation details of our code while trusting that the behaviour stays the same.

**Coupling**

Coupling refers to the degree that one element (class, module, etc) has knowledge about another. High coupling brings many disadvantages to our codebase including increased complexity, reduced reusability, and difficulties in maintenance. But why are these disadvantages? If code is complex, it is hard to read and therefore hard to change (I cover readability in more depth below); reusable code means we follow DRY and overall need to work with less code which is always easier; difficulties in maintenance pretty much means “hard to change” so no explanation needed 🙂

**Encapsulation**

Encapsulation is one of the four fundamental principles of object-oriented programming (OOP). It refers to the bundling of data (variables) and methods (functions) that operate on the data into a single unit or class. It also involves restricting direct access to some of the object’s components as a means of preventing accidental interference and misuse of the methods and data. Following this principle helps prevents us from introducing coupling (as well as malfunctioning code into our system).

**Composition over inheritance**

Composition over inheritance states that classes should favour polymorphic behaviour and code reuse by their composition rather than inheriting from a base class. In other words, if some class needs some functionality from another class, it's better if it comes from keeping an instance of that class rather than from inheriting from that class. Relying on inheritance has many disadvantages including breaking encapsulation, tight coupling to the parent class, the [Fragile Base Class Problem](https://en.wikipedia.org/wiki/Fragile_base_class), and so on. The Fragile Base Class problem is a fundamental OOP problem where base classes are considered “fragile” because modifications impact all base classes in the hierarchy and may cause them to malfunction, in other words, they are hard to change.

**Readability**

Sometimes clean code is defined as being readable and many principles of clean code have this as an underlying principle, for example: meaningful names, KISS (Keep It Simple Stupid), consistent formatting, meaningful whitespace, etc. But even readability comes down to changeability: why would code need to be readable if it wouldn’t need to be changed? The exception is perhaps reading the source code of open-source libraries that we use in our projects but this makes up a tiny portion of overall time spent reading code; the majority is spent reading code in the codebase we are working on. When we write new code, we typically spend far more time reading than writing; therefore, to reduce the overall time spent making a change we need to be able to quickly read and understand the existing code.

I’m starting to labour this point so it’s time to summarise 😄

# Conclusion

Instead of thinking about clean code as a list of principles, it helps me to think of it as the single, underlying quality that is the foundation for the myriad principles: code that is easy to change. This gives me a singular guiding light when aiming to write clean code, instead of thinking of a laundry list of items, I can ask myself “will this be easy for one of my colleagues to change in the future?”, and if not, I can look at the laundry list for inspiration on how to improve it. I hope this way of thinking is helpful for you too.

**Further Reading**

The book that first got me interested in clean code is the classic [Clean Code by Robert C. Martin](https://www.goodreads.com/book/show/3735293-clean-code). It was recommended to me by my first mentor and I have recommended it to all my mentees ever since.
