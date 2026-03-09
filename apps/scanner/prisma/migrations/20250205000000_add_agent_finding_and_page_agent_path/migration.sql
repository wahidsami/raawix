PS C:\Users\wahid> docker exec raawix_postgres psql -U postgres -d postgres -c "CREATE DATABASE raawix_fresh_test;"
ERROR:  database "raawix_fresh_test" already exists
PS C:\Users\wahid> docker exec raawix_postgres psql -U postgres -d postgres -c "CREATE DATABASE raawix_fresh_test_shadow;"
ERROR:  database "raawix_fresh_test_shadow" already exists
PS C:\Users\wahid> docker exec raawix_postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS raawix_fresh_test;"
DROP DATABASE
PS C:\Users\wahid> docker exec raawix_postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS raawix_fresh_test_shadow;"
DROP DATABASE
PS C:\Users\wahid> docker exec raawix_postgres psql -U postgres -d postgres -c "CREATE DATABASE raawix_fresh_test;"
CREATE DATABASE
PS C:\Users\wahid> docker exec raawix_postgres psql -U postgres -d postgres -c "CREATE DATABASE raawix_fresh_test_shadow;"
CREATE DATABASE