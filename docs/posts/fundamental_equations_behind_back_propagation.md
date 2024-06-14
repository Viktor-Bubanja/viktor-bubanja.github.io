---
draft: False
date: 2024-06-04
slug: back-propagation-equations
authors:
  - viktorbubanja
---
# Proofs of the Four Fundamental Equations Behind Back Propagation

When learning about how gradient descent and back propagation work, it can be tempting to take the underlying mathematics as a given and skip over the details. This is especially true with the level of abstraction that modern machine learning libraries like TensorFlow and PyTorch work at. However, a quote that I have observed to be true over and over again applies here:
> "All non-trivial abstractions, to some degree, are leaky." - Joel Spolsky

I believe it always pays to understand the behind-the-scenes workings of the technologies we work with because at some point things will go wrong and we will need understanding at a deeper level (you can read more about the Law of Leaky Abstractions [here](https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/)).

Therefore, since back propagation is a foundational concept in machine learning, it is worth attaining a deep level of understanding of the constituting equations. For mathematics, this typically requires understanding the proofs of the equations.


All four proofs rely on the chain rule from multivariate calculus. If you are comfortable with the chain rule I recommend first attempting the proofs yourself.
<!-- more -->

*Note: I only cover the four fundamental equations here but if you are interesting in a deeper understanding of the overall algorithm I highly recommend the free online textbook [Neural Networks and Deep Learning](http://neuralnetworksanddeeplearning.com/index.html) by Michael Nielsen which doesn't skip over any of the underlying heavy stuff.*


# First Equation: Error in the Output Layer (δᴸ)
This equation measures how fast the cost function is changing as a function of the $j^th$ output activation.

  $$
  \delta^L = \nabla_a C \odot \sigma'(z^L) \tag{BP1}
  $$

where:

- \( \delta^L \) is the vector of errors at the output layer L
- \( \nabla_a C \) is the gradient of the cost function with respect to the output activations
- \( \sigma' \) is the derivative of the activation function
- \( z^L \) is the input to the neurons in the output layer
  

### First Equation Proof

In multivariate calculus, the generalised chain rule involves summing the partial derivatives like so:

   $$
   \frac{dz}{dt} = \frac{dz}{dx}\frac{dx}{dt} + \frac{dz}{dy}\frac{dy}{dt}
   $$

or more generally:

   $$
   \frac{\partial z}{\partial t} = \sum_{j} \frac{\partial z}{\partial u_j}\frac{\partial u_j}{\partial t}
   $$

In other words, we calculate $\frac{\partial z}{\partial t}$ through all "paths" (or functions) through which $z$ is functionally dependent on $t$.

In the context of back propagation, this means that:

   $$
   \frac{\partial C}{\partial z_{j}^L} = \sum_{k} \frac{\partial C}{\partial a_{k}^L}\frac{\partial a_{k}^L}{\partial z_{j}^L}
   $$

Since $a_k$ is a function of $z_j$ only when $k=j$ (i.e. $z_j$ is not found in $a_k$ and so $\frac{\partial a_k}{\partial z_j} = 0$ when $k \neq j$), we can simplify this to:

   $$
   \frac{\partial C}{\partial z_{j}^L} = \frac{\partial C}{\partial a_{j}^L}\frac{\partial a_{k}^L}{\partial z_{j}^L}
   $$

Recalling that $a_{j}^L = \sigma(z_{j}^L)$, the equation becomes:

   $$
   \delta_{j}^L = \frac{\partial C}{\partial a_{j}^L}  \sigma'{\partial z_{j}^L} \tag{BP1}
   $$


(component expression for $\delta_{j}^L$ which is equivalent to the above matrix-based form).

# Second Equation: Error δᴸ in terms of the Error δᴸ⁺¹ in the Next Layer
The error \( \delta^l \) for any layer \( l \) in terms of the error \( \delta^{l+1} \) in the next layer \( l+1 \) is given by:
 $$
 \delta^l = ((w^{l+1})^T \delta^{l+1}) \odot \sigma'(z^l) \tag{BP2}
 $$

- \( \delta^l \) is the vector of errors for any layer l.
- \( w^{l+1} \) represents the weights from layer l to layer l+1.
- \( \delta^{l+1} \) is the error at layer l+1.

### Second Equation Proof



$$
\begin{align}
\delta_j^l &= \frac{\delta C}{\delta z_{j}^l} \\
&=\sum\frac{\partial C}{\partial z_{k}^{l+1}}\frac{\partial z_{k}^{l+1}}{\partial z_{j}^l} \\
&=\sum\frac{\partial z_k^{l+1}}{\partial z_j^l}\delta_k^{l+1}
\end{align}
$$
To find $\frac{\partial z_k^{l+1}}{\partial z_j^l}$:
$$
\begin{align}
z_k^{l+1} &= \sum_{j}w_{kj}^{l+1}a_j^l + b_k^{l+1} \\
&= \sum_{j}w_{kj}^{l+1}\sigma(z_j^l) + b_k^{l+1}
\end{align}
$$
Differentiating with respect to $z_j^{l}$:
$$
\begin{align}
\frac{\partial z_k^{l+1}}{\partial z_j^l} &= w_kj^{l+1}\frac{\partial a_j^l}{\partial z_j^l} \\
&= w_kj^{l+1}\sigma'(z_j^l)
\end{align}
$$
Substituting back:
$$
   \sum \frac{\partial z_k^{l+1}}{\partial z_j^l} \delta_k^{l+1} = \sum w_kj^{l+1} \sigma ' (z_j^l) \delta _k ^{l+1}
$$
which is BP2 in component form.



# Third Equation: Rate of Change of the Cost with Respect to Any Bias in the Network
   $$
   \frac{\partial C}{\partial b_j^l} = \delta_j^l \tag{BP3}
   $$

- \( \frac{\partial C}{\partial b^l_j} \) represents the partial derivative of the cost function with respect to the bias of the j-th neuron in the l-th layer.
- \( \delta^l_j \) is the error term for the j-th neuron in the l-th layer, indicating how much the cost function changes with a change in the bias of this neuron.


### Third Equation Proof
Substituting BP2 in component form:

  $$
  \begin{align}
  \frac{\partial C}{\partial b_j^l} &= \sum_k \frac{\partial C}{\partial z_k^{l+1}} \frac {\partial z_k^{l+1}}{\partial b_j^l} \\
  &= \sum_k \delta _k^{l+1} \frac {\partial z_k^{l+1}}{\partial b_j^l}
  \end{align}
  $$

Finding $\frac {\partial z_k^{l+1}}{\partial b_j^l}$:

  $$
  \begin{align}
  z_k^{l+1} &= \sum_j w_{kj}^{l+1} a_j^l + b_k^{l+1} \\
  &= \sum_j w_{kj}^{l+1} \sigma (z_j^l) + b_k^{l+1}
  \end{align}
  $$

We can write $z_j^l = W + b_j^l$ where $W$ is equal to the sum of the weighted inputs tothe $j^{th}$ neuron in the $l^{th}$ layer (i.e. $W = z_j^l - b_j^l$).
Then:

  $$
  z_k^{l+1} = \sum_j w_{kj}^{l+2} \sigma (W + b_j^l) + b_k^{l+1}
  $$

For a specific weight, $b_j^l$:

  $$
  \frac {\partial z_k^{l+1}}{\partial b_j^l} = w_{kj}^{l+1} \sigma ' (z_j^l)
  $$

Substituting back:

  $$
  \frac {\partial C}{\partial b_j^l} = \sum_k \delta_k^{l+1} \frac {\partial z_k^{l+1}}{\partial b_j^l} = \sum_k \delta_k^{l+1}w_{kj}^{l+1} \sigma'(z_j^l) = \delta_j^l
  $$


# Fourth Equation: Rate of Change of the Cost with Respect to Any Weight in the Network
   $$
   \frac{\partial C}{\partial w_{jk}^l} = a_k^{l-1} \delta_j^l \tag{BP4}
   $$

- \( \frac{\partial C}{\partial w^l_{jk}} \) is the partial derivative of the cost function with respect to the weight connecting the k-th neuron in the (l-1)-th layer to the j-th neuron in the l-th layer.
- \( a^{l-1}_k \) is the activation of the k-th neuron in the (l-1)-th layer.
- \( \delta^l_j \) is the error term for the j-th neuron in the l-th layer.


### Fourth Equation Proof

  $$
  \begin{align}
  \frac{\partial C}{\partial w_{jk}^l} &= \sum_k \frac{\partial C}{\partial z_j^l} \frac{\partial z_j^l}{\partial w_{jk}^l} \\
  &= \sum_k \frac{\partial z_j^l}{\partial w_{jk}^l} \delta_j^l \\
  &= \frac {\partial z_j^l}{\partial w_{jk}^l} \delta_j^l
  \end{align}
  $$

*Note: we can make the simplification to remove the summation because $z_j^l$ is only a function of $w_{jk}$ for the weighted input of $w_{jk}$ and so differentiating $z_j^l$ by any other weight equals zero.*

Finding $\frac {\partial z_j^l}{\partial w_{jk} ^l}$:

  $$
  \begin{align}
  z_j^l &= \sum_k w_{jk}^la_k^{l-1} + b_j^l \\
  \frac {\partial z_j^l}{\partial w_{jk}^l} &= a_k^{l-1}
  \end{align}
  $$
(for a specific weight $w_{jk}^l$).

Substituting back:

  $$
  \frac{\partial C}{\partial w_{jk}^l} = \frac{\partial z_j^l}{\partial w_{jk}^l} \delta _j^l = a_k^{l-1} \delta_j^l \tag{BP4}
  $$
