# An adaptive bookreader app 

I'm a non native English speaker. I often read English books and I
noticed that I spend too much time on dictionries. Even books for
children, but especially academic literature, tend to abuse C2 level
words from time to time nonetheless for many cases there's a perfect
synonym or a short phrase that is understanble by a B2 level
speaker. Such practice, besides, slowing down the reading process
itself, hampers learning the language, because to many new words
overload your brain. So as the result, the reader doesn't grasp any
them and his or her attention quickly declains. Also these super rare
book words are barely useful in real life. They only take your time
for translation.  The rule 20/80 works here too - file of all unique
words scrapped from the Internet is more than 300k, but how many words
do you know?

Adapted literature is a niche area with a very limited books to choose
on the market. Such situtation naturally forms because everone is
different in his knowledge of language.

Thanks to advances in the information technologies, any decent
bookreader app has a built-in translator feature, but it's still dull
and boring to click through every new word that you see
first and last time in your life. Why not to replace rare words with more
common synonyms in advance?

As I said above, everyone has its own vocabulary but I bet there's
some correlation between a vocabulary size and frequencies of its words.

The key idea behind the app is to use a word frequency heruistic to
quickly decide whether a word should be replaced with a more common
synonym or not.  Of course, a user can mark words unknown/known to him
explicitly.

Apart from that - the app tracks all words in book left intact and
remembers them. So later in case of places where a book containts lot
of new words the threshold level for rare words can be lowered without
getting every other word translated.

Additionly, a user of the app gets control of how much time on average
he is ready to dedicate on extending his vocabulary. If reading gets
too overwhelming just lower the word frequency threshold for auto
replacement!

Tweaking word frequency threshold can be automated too by a metric
like max number of new words per 10000.

