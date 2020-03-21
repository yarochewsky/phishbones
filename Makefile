NAME = "phishbones"

build:
	docker build -t ${NAME} . 

run:
	@echo "running scan with $(URL)..."
	docker run --cap-add=SYS_ADMIN -it -e URL="$(URL)" -e ASSETS="$(ASSETS)"  ${NAME}
