#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <unistd.h>
int main()
{
   setuid(0);
   system("./restart_nginx.sh");
   return 0;
}

