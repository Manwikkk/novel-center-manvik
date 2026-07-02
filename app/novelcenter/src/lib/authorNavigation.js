/** Leave Author Studio and return to the Profile tab root screen. */
export function exitAuthorStudioToProfile(navigation) {
  const accountStack = navigation.getParent();
  if (accountStack?.navigate) {
    accountStack.navigate('Account');
    return;
  }
  navigation.goBack();
}
